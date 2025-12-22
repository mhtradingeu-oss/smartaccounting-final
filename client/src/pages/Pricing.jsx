//
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import LoadingSpinner from '../components/LoadingSpinner';

const getStripePromise = () => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return null;
  }

  if (!publishableKey.startsWith('pk_')) {
    return null;
  }

  return loadStripe(publishableKey);
};

const stripePromise = getStripePromise();

const CheckoutForm = ({ planId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {return;}

    setLoading(true);
    setError(null);

    try {
      
      const { data } = await api.post('/stripe/create-subscription', { planId });
      const subscription = data.subscription || data;
      const clientSecret = subscription?.latest_invoice?.payment_intent?.client_secret;

      if (clientSecret) {
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        });

        if (result.error) {
          setError(result.error.message);
          return;
        }
      } else if (!subscription) {
        setError('Subscription could not be created');
        return;
      }

      onSuccess(subscription?.id || subscription?.subscriptionId || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-md">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Subscribe Now'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

const PlanCard = ({ plan, currentPlan, onSelectPlan, subscriptionStatus }) => {
  const isCurrentPlan = currentPlan === plan.id;
  const isActive = subscriptionStatus === 'active';

  return (
    <Card className={`relative ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}>
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Current Plan
          </span>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900">€{plan.price}</span>
          <span className="text-gray-600 ml-1">/month</span>
        </div>

        <ul className="space-y-2 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>

        <Button
          onClick={() => onSelectPlan(plan)}
          disabled={isCurrentPlan && isActive}
          className="w-full"
          variant={isCurrentPlan ? 'secondary' : 'primary'}
        >
          {isCurrentPlan && isActive ? 'Current Plan' : 
           isCurrentPlan ? 'Reactivate' : 'Select Plan'}
        </Button>
      </div>
    </Card>
  );
};

const Pricing = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [plans] = useState({});
  const [subscriptionStatus] = useState(null);
  const [loading] = useState(true);
  const [selectedPlan] = useState(null);
  const [showCheckout] = useState(false);
  const [error] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('pricing')} unavailable
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={fetchData}>
          Retry
        </Button>
      </div>
    );
  }

  // Empty state for no plans
  const plansArray = Object.values(plans);
  if (!plansArray.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('noPlansAvailable') || 'No plans available'}
        </h2>
        <p className="text-gray-600 mb-6">Please check back later.</p>
        <Button onClick={fetchData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t('choosePlan')}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t('pricingSubtitle')}
        </p>

        {subscriptionStatus && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg inline-block">
            <p className="text-sm text-blue-800">
              {t('status')}: <span className="font-semibold capitalize">{subscriptionStatus.status || subscriptionStatus.subscriptionStatus}</span>
              {subscriptionStatus.plan && (
                <span className="ml-2">({plans[subscriptionStatus.plan]?.name})</span>
              )}
            </p>
          </div>
        )}
      </div>

      {showCheckout ? (
        <div className="max-w-md mx-auto">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Subscribe to {selectedPlan.name}
              </h3>
              <p className="text-gray-600 mb-6">
                €{selectedPlan.price}/month - {selectedPlan.features.length} features included
              </p>

              <Elements stripe={stripePromise}>
                <CheckoutForm
                  planId={selectedPlan.id}
                  onSuccess={handleSubscriptionSuccess}
                  onCancel={handleCancelCheckout}
                />
              </Elements>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plansArray.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={subscriptionStatus?.plan}
              subscriptionStatus={subscriptionStatus?.status}
              onSelectPlan={handleSelectPlan}
            />
          ))}
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Need a custom solution for your enterprise?
          </p>
          <Button variant="secondary">
            {t('contactSales')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Pricing;
