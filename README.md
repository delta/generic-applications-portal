# generic-applications-portal

Two folders:
1. form\_generator - code to generate form related code.
2. server - actual application portal

## Only compiling the markup to HTML
To compile the markup, go to **`server`** (~`form_generator`~) folder, and then, use:

```node ../form_generator/index.js sample.html```

## Compiling the markup to HTML with custom layout file
To compile the markup with custom layout file, go to **`server`** (~`form_generator`~) folder, and then, use:

```node ../form_generator/index.js -l mylayout.html sample.html```

## Compiling the markup to HTML with custom layout file and also generating Database seed files

1. First of all you need to bring up the database.
    ```../node_modules/.bin/sequelize db:migrate```
    This will bring up all the tables. In case this fails, run db:migrate:down first. If that also
    fails, clear the database manually, and then run the above command. Make sure that the database
    called ```generic_applications_portal``` is created in mysql already.

2. Now create a seeder file for formElements:
    ```../node_modules/.bin/sequelize db:seed:generate -name formElements```
    Ensure that a file having 'formElements' in it's name doesn't exist. This is just to ensure that each formElements seeder file consists data only for a single application. As a general
    rule, name the seeder such that it includes the name of the application.
    If you know what you're doing, feel free to do whatever.

3. Now you need to compile the markup.
    ```node ../form_generator/index.js -s seeders/*formElements.js sample.html```
    If you have multiple files ending in `formElements.js` in the seeders folder, make sure you
    specify the exact file name.

4. Now you want to store all the formElements data in the database.
```../node_modules/.bin/sequelize db:seed:all```
    Make sure you don't run this command multiple times, otherwise there will be multiple copies
    of the same formElements in database. Simple way to check if there are duplicates in DB is
    to simply check for duplicates in the `Forms` table.