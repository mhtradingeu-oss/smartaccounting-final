
import React, { useState } from 'react';
import {
  CalculatorIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const Calculator = () => {
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [vatRate, setVatRate] = useState('19');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const calculateTax = () => {
    setError(null);
    const grossIncome = parseFloat(income);
    const totalExpenses = parseFloat(expenses);
    const vat = parseFloat(vatRate);
    if (isNaN(grossIncome) || isNaN(totalExpenses) || isNaN(vat)) {
      setError('Please enter valid numbers for all fields.');
      setResults(null);
      return;
    }
    const netIncome = grossIncome - totalExpenses;
    const vatAmount = (grossIncome * vat) / 100;
    const incomeTax = calculateIncomeTax(netIncome);
    const solidarityTax = incomeTax * 0.055;
    setResults({
      grossIncome,
      totalExpenses,
      netIncome,
      vatAmount,
      incomeTax,
      solidarityTax,
      totalTax: vatAmount + incomeTax + solidarityTax,
    });
  };

  const calculateIncomeTax = (income) => {
    // Simplified German income tax calculation
    if (income <= 10908) {return 0;}
    if (income <= 15999) {return income * 0.14;}
    if (income <= 62809) {return income * 0.24;}
    if (income <= 277825) {return income * 0.42;}
    return income * 0.45;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Tax Calculator</h1>
        <p className="page-subtitle">
          Calculate your German taxes and VAT obligations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calculator Form */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <CalculatorIcon className="h-6 w-6 text-primary-600" />
            <h3 className="section-title">Tax Calculation</h3>
          </div>

          <div className="space-y-6">
            <div className="form-group">
              <label className="form-label">
                Gross Income (Annual)
              </label>
              <div className="relative">
                <CurrencyEuroIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="input pl-10"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Business Expenses (Annual)
              </label>
              <div className="relative">
                <CurrencyEuroIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value)}
                  className="input pl-10"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                VAT Rate
              </label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="input"
              >
                <option value="19">19% (Standard Rate)</option>
                <option value="7">7% (Reduced Rate)</option>
                <option value="0">0% (VAT Exempt)</option>
              </select>
            </div>

            <button
              onClick={calculateTax}
              className="w-full btn-primary"
            >
              <CalculatorIcon className="h-4 w-4 mr-2" />
              Calculate Taxes
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <DocumentTextIcon className="h-6 w-6 text-emerald-600" />
            <h3 className="section-title">Tax Calculation Results</h3>
          </div>

          {error && (
            <div className="text-center py-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {results && !error ? (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Income Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Gross Income:</span>
                    <span className="font-medium">{formatCurrency(results.grossIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Business Expenses:</span>
                    <span className="font-medium">-{formatCurrency(results.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Net Income:</span>
                    <span>{formatCurrency(results.netIncome)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Tax Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">VAT ({vatRate}%):</span>
                    <span className="font-medium">{formatCurrency(results.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Income Tax:</span>
                    <span className="font-medium">{formatCurrency(results.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Solidarity Tax:</span>
                    <span className="font-medium">{formatCurrency(results.solidarityTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t text-red-600">
                    <span>Total Tax:</span>
                    <span>{formatCurrency(results.totalTax)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Net After Tax</h4>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(results.netIncome - results.incomeTax - results.solidarityTax)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Enter your income and expenses to calculate taxes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tax Information */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <InformationCircleIcon className="h-6 w-6 text-blue-600" />
          <h3 className="section-title">German Tax Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">VAT Rates</h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Standard rate: 19%</li>
              <li>• Reduced rate: 7%</li>
              <li>• Essential goods, books, food</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Income Tax</h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Progressive tax system</li>
              <li>• 14% to 45% tax rate</li>
              <li>• Basic allowance: €10,908</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Solidarity Tax</h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• 5.5% of income tax</li>
              <li>• For German reunification</li>
              <li>• Applied automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
