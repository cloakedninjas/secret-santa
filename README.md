#Secret Santa

## About

This is an ExpressJS-based application that provides a simple form for users to sign up to a Secret Santa mailing group.
The host can then login and send out the emails, one per person, telling each person who they need to buy a gift for.

## Installation

    $ npm install secret-santa

## Usage

Copy or rename `app/config/default.json` to `app/config/config.json` to suit your needs. You should change the
admin password as well as the default secrets for Session and Cookie storage.

Run the server using:

    $ node index.js

## Config

**title**

Set the sub heading on the page

**admin-password**

The password to access the admin page located at `/admin`

**deadline**

Your chosen deadline, appear on the top left of the screen

**spend-limit**

Your chosen purchase allowance, appear on the top left of the screen

**email-server**

Configure the email server to send out emails to the participants. Can be either an SMTP server or Mailgun (https://mailgun.com)

If you use Mailgun, only `api-key` is required.

If you choose SMTP, you need to pass in config options to Nodemailer (http://nodemailer.com) via `options`. Here is a sample config:

    "email-server": {
      "type": "SMTP",
      "options": {
        "service": "Gmail",
        "auth": {
            "user": "gmail.user@gmail.com",
            "pass": "userpass"
        }
      }
    }

**cookie-secret**

Used for Express's cookie parser middleware

**session-secret**

Used for Express's session middleware