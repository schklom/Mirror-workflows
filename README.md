# cryptocom-csv-firefly-iii

As of now there is no other way to get your movements out of your Crypto.com Wallet (not DeFi Wallet App) than exporting it to CSV files. This service provides a file share where you can drop your exported CSV files and automatically import it to your Firefly III instance.

# How to use

## Run it from Docker Hub

Get and run this service from Docker hub image:

```
docker pull financelurker/cryptocom-csv-firefly-iii:latest
docker run -d --name cryptocom-csv-firefly-iii \
	-v "<<import directory>>":"/var/cryptocom-csv-firefly-iii/csv-to-import" \
	-v "<<history directory>>":"/var/cryptocom-csv-firefly-iii/csv-import-history" \
	-v "<<failed directory>>":"/var/cryptocom-csv-firefly-iii/csv-import-failed" \
	-e IMPORT_INTERVAL=<<seconds>> \
	-e FIREFLY_III_ACCESS_TOKEN=<<access token>> \
	-e FIREFLY_III_URL=<<url to firefly instance>> \
	-e PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
	-e LANG=C.UTF-8 \
	-e GPG_KEY=E3FF2839C048B25C084DEBE9B26995E310250568 \
	-e PYTHON_VERSION=3.9.4 \
	-e PYTHON_PIP_VERSION=21.0.1 \
	-e PYTHON_GET_PIP_URL=https://github.com/pypa/get-pip/raw/29f37dbe6b3842ccd52d61816a3044173962ebeb/public/get-pip.py \
	-e PYTHON_GET_PIP_SHA256=e03eb8a33d3b441ff484c56a436ff10680479d4bd14e59268e67977ed40904de \
	financelurker/cryptocom-csv-firefly-iii:latest
```

## Run it from code

Get and run this service from Docker hub image:

```
git clone <tbd>
cd cryptocom-csv-firefly-iii/src
<< set environmental variables and create directories >>
python main.py
```

## Configuration

### Firefly III Accounts

For each coin you handle in your **Crypto.com Crypto** Wallet add an account with the appropriate currency (if not existent, create one).
To each of those accounts add the notes-identifier **"cryptocom-csv-firefly-iii:crypto-wallet"**, so the service can identify between which asset accounts in your Crypto Wallet the transfer should be inserted.

### Directories

In order to get this service to work you need three directories, which are the main interface to this service:

* Import Directory
  * This directory is the input for the service. Just drop a Crypto.com csv file (from Crypto Wallet for now).
  If the run was successful - for now - after each run this directory should be empty.
* History Directory
  * This is the output directory for a successfully imported csv file and is considered "reporting"
* Failed Directory
  * The service puts failed to import csv files here. In addition a dedicated "report_"-file will be generated containing information what the cause of this fail was.

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
