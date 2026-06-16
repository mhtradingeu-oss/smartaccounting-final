import React from 'react';
import { Link } from 'react-router-dom';

export default function Exports() {
  return (
    <div>
      <h1>Exports</h1>
      <ul>
        <li>
          <Link to="/exports/datev">DATEV Export</Link>
        </li>
        {/* ...other export links... */}
      </ul>
    </div>
  );
}
