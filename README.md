# Wallapop Fee Calculator
A Chrome extension that calculates Wallapop Portugal's Protection Fee directly on the website.

<p align="left">
  <img src="images/example.png" width="720" alt="Calculator on a Wallapop listing">
</p>

> **Disclaimer:** this is an independent project. It has no commercial association with Wallapop.


**Language**: PT-PT

## Installation

1. Go to the [Releases page](https://github.com/nferrari464-prog/wallapop-fee-calculator-pt/releases) and download the `.zip` file of the latest version (not "Source code").
2. Extract the ZIP file to a folder.
3. Open Chrome and go to `chrome://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder (the one containing `manifest.json`).

## Updating from a previous version

1. Open `chrome://extensions`.
2. Remove the previous version, or load the new extracted folder.
3. Refresh the Wallapop listing page.

## Fee table

| Item price | Protection fee |
|---|---|
| 1€ to 25€ | 1,95€ |
| Above 25€ up to 100€ | 1.95 + (161/1500) × (price − 25) |
| Above 100€ up to 300€ | 10 + 9.1 × ln(price/100) |
| Above 300€ up to 1.000€ | 20€ |
| Above 1.000€ up to 2.500€ | 50€ |

- Outside the 1€ to 2.500€ range there is no calculation, because those prices are not covered by Wallapop Protection.
- The fee and the total are rounded to two decimal places.
- The total shown is the item price plus the protection fee. **It does not include shipping.**

> **Note:** always confirm the final price at the Wallapop checkout.

## Versions

The source code in this repository is visible on the main page. Every version can be downloaded as a `.zip` file from the [Releases page](https://github.com/nferrari464-prog/wallapop-fee-calculator-pt/releases).

## License

This project is licensed under the GPL v3. See the [LICENSE](LICENSE) file.
