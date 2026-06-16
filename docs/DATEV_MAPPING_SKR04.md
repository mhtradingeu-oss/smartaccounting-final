# DATEV Mapping — SKR04

## Overview

This document details the SKR04 account mapping used in SmartAccounting for DATEV exports.

## Account Table (SKR04)

| Transaction Type | Description        | Account Code |
| ---------------- | ------------------ | ------------ |
| Revenue 19%      | Domestic sales 19% | 4400         |
| Revenue 7%       | Domestic sales 7%  | 4300         |
| Input VAT 19%    | Vorsteuer 19%      | 1576         |
| Input VAT 7%     | Vorsteuer 7%       | 1571         |
| ...              | ...                | ...          |

## Account Logic per Transaction Type

- **Invoice:** Revenue account based on VAT rate
- **Expense:** Input VAT account based on VAT rate
- **Correction:** Follows original transaction logic, with reversal flag

## VAT Mapping per Tax Case

| VAT Case       | Account Code |
| -------------- | ------------ |
| 19%            | 1576         |
| 7%             | 1571         |
| Reverse Charge | 1776/1577    |
| ...            | ...          |

_See also: DATEV_VAT_MAPPING.md_
