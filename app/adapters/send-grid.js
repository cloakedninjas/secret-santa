const sgMail = require('@sendgrid/mail');

module.exports = class SendGridAdapter {
  constructor (opts, fromAddress) {
    this.fromAddress = fromAddress;
    sgMail.setApiKey(opts['api-key']);
  }

  send (messages) {
    messages.forEach((message) => {
      message.from = this.fromAddress;
    });

    return sgMail.sendMultiple(messages);
  }
};
