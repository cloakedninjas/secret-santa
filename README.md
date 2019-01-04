# Secret Santa

## About

This is an Express-based application that provides a simple form for users to sign up to a Secret Santa mailing group.
The host can then login and send out the emails, one per person, telling each person who they need to buy a gift for.

Build Status: [![CircleCI](https://circleci.com/gh/cloakedninjas/secret-santa/tree/master.svg?style=shield)](https://circleci.com/gh/cloakedninjas/secret-santa/tree/master)

## Installation

`$ git clone https://github.com/cloakedninjas/secret-santa.git --depth 1`

## Usage

Copy or rename `app/config/default.json` to `app/config/config.json` to suit your needs. You should change the
admin password as well as the default secrets for Session and Cookie storage.

Run the server using:

`$ npm start`

## Config

**title**

Set the sub heading on the page

**admin-password**

The password to access the admin page located at `/admin`

**deadline**

Your chosen deadline, appears on the top left of the screen

**spend-limit**

Your chosen purchase allowance, appears on the top left of the screen

**email-server**

Currently only Send Grid (https://sendgrid.com/) is supported, sign up for a trial account to send free emails.
Then paste your API key into the config

```
"email-server": {
    "type": "sendgrid",
    "from-address": "santa@example.com",
    
    "options": {
      "api-key": "abc-123"
    }
}
```

**cookie-secret**

Used for Express's cookie parser middleware

**session-secret**

Used for Express's session middleware

## Customizing

All templates (including the email) are stored in `app/views`, and are fully customizable.

- `layout.ejs` is the main template
- `index.ejs` is what users will see when they register

## Other commands

`npm run <cmd>`
- `test` runs tests
- `lint` runs eslint over code
- `css` build and minifies the CSS
