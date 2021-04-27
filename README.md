# cryptocom-csv-firefly-iii

As of now there is no other way to get your movements out of your Crypto.com Wallet (not DeFi Wallet App) than exporting it to CSV files. This service provides a file share where you can drop your exported CSV files and automatically import it to your Firefly III instance.

Well, as there's more information needed than provided within these csv files to map the transactions to the appropriate accounts within Firefly III it's not "just importing a csv". Therefore the csv-importer isn't used and instead the Firefly III API is called directly.

# How to use

## Run it from Docker Hub

Get and run this service from Docker hub image:

```
docker pull financelurker/cryptocom-csv-firefly-iii:latest
docker run <tbd>
```

## Run it from code

This way needs the csv-importer binaries also be available on the PATH environment variable.

Get and run this service from Docker hub image:

```
git clone <tbd>
cd cryptocom-csv-firefly-iii/src
python main.py
```

## Configuration

### Directories

In order to get this service to work you need three directories:


### Environment

In order to run this service you need to configure some environmental variables:

- **FIREFLY_HOST**
  - Description: The url to your Firefly III instance you want to import trades. (e.g. "https://some-firefly-iii.instance:62443")
  - Type: string
- **FIREFLY_VALIDATE_SSL**
  - Description: Enables or disables the validation of ssl certificates, if you're using your own x509 CA.
    (there probably are better ways of doing this)
  - Type: boolean [ false | any ]
  - Optional
  - Default: true
- **FIREFLY_ACCESS_TOKEN**
  - Description: Your access token you have created within your Firefly III instance.
  - Type: string
- **IMPORT_INTERVAL**
  - Description: This property defines the interval in seconds for the scraping of the "trigger_csv_import" directory.
  - Type: number
  - Default: 300 (every 5 minutes)
- **IMPORT_DIRECTORY**
  - Description: This property defines the import directory where this service should look for new csv files.
  - Type: string
  - Default: /var/crypto-com-csv-firefly-iii/csv-to-import
- **HISTORY_DIRECTORY**
  - Description: This property defines the directory where all successfully imported csv files should be stored.
  - Type: string
  - Default: /var/crypto-com-csv-firefly-iii/csv-import-history
- **FAILED_DIRECTORY**
  - Description: This property defines the directory where all failed imported csv files should be stored.
  - Type: string
  - Default: /var/crypto-com-csv-firefly-iii/csv-import-failed
- **DEBUG**
  - Description: This property defines if debug mode is enabled or not. If debug mode is enabled the import_interval is set to 5 seconds and all written elements to Firefly III additionally get the "dev" tag.
  - Type: boolean [ true | any ]
  - Optional
  - Default: False
