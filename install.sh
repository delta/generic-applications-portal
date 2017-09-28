#!/bin/bash

# Installation required:
# 1. nodejs 6.x (latest stable)
# 2. npm v4.x
# 3. git
# 4. mysql
# 5. phpMyAdmin (not required right now, can be installed later).

set -x

# Set up the variables
DB_HOST="127.0.0.1"
DB_USER=root
DB_PASSWORD=""
DB_NAME="recruitment2017"

# Installation starts
npm install

# copy sample configs to actual configs
cp server/config/session_config.js.sample server/config/session_config.js
cp server/config/config.js.sample server/config/config.js
cp server/config/gmail.js.sample server/config/gmail.js

# Update database config to actual values
sed -i 's/"username": [^,]+/"username": "'$DB_USER'",/g' config.js
sed -i 's/"password": [^,]+/"password": "'$DB_PASSWORD'",/g' config.js
sed -i 's/"database": [^,]+/"database": "'$DB_NAME'",/g' config.js
sed -i 's/"host": [^,]+/"host": "'$DB_HOST'",/g' config.js

cd server

# Create mysql table
if [ $DB_PASSWORD ]
then
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "Create database $DB_NAME;"
else
    mysql -u "$DB_USER" -e "Create database $DB_NAME;"
fi

# Run the migrations
../node_modules/.bin/sequelize db:migrate
../node_modules/.bin/sequelize seed:generate --name formElements

# Compile the markup and generate seeder
node ../form_generator/index.js -l views/formLayout.ejs -s migrations/*-formElements.js ../form_generator/sample.html > views/form.ejs

# Seed the database
../node_modules/.bin/sequelize db:seed:all

# Start the server
# Will listen on port 3000
node ./bin/www