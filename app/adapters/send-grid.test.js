const sinon = require('sinon');
const expect = require('chai').expect;
const sgMail = require('@sendgrid/mail');
const SendGridAdapter = require('../adapters/send-grid');

describe('SendGridAdapter', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor()', () => {
    it('should set the API key', () => {
      const stub = sandbox.stub(sgMail, 'setApiKey');

      new SendGridAdapter({
        'api-key': 'test-123'
      }, '');

      expect(stub.calledWith('test-123')).to.equal(true);
    });
  });

  describe('send()', () => {
    it('should send messages', () => {
      const stub = sandbox.stub(sgMail, 'sendMultiple');

      const adapter = new SendGridAdapter({
        'api-key': 'test-123'
      }, 'sender@test.com');

      adapter.send([
        {
          to: 'test@example.com'
        }
      ]);

      expect(stub.calledWith([
        {
          to: 'test@example.com',
          from: 'sender@test.com'
        }
      ])).to.equal(true);
    });
  });
});
