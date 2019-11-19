function createSingleMessageSenderJob (lib, mylib) {
  'use strict';

  var qlib = lib.qlib,
    JobOnSender = mylib.JobOnSender;

  function SingleMessageSenderJob (sender, sendername, recipient, subject, body, notbefore, notafter, backreference, defer) {
    JobOnSender.call(this, sender, defer);
    this.sender = sendername;
    this.recipient = recipient;
    this.subject = subject;
    this.body = body;
    this.notbefore = notbefore;
    this.notafter = notafter;
    this.backreference = backreference;
    this.sendingid = null;
  }
  lib.inherit(SingleMessageSenderJob, JobOnSender);
  SingleMessageSenderJob.prototype.destroy = function () {
    this.sendingid = null;
    this.notafter = null;
    this.notbefore = null;
    this.body = null;
    this.subject = null;
    this.recipient = null;
    this.sender = null;
    JobOnSender.prototype.destroy.call(this);
  };
  SingleMessageSenderJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    this.writeInitial();
    return ok.val;
  };
  SingleMessageSenderJob.prototype.writeInitial = function () {
    if (!this.okToProceed()) {
      return;
    }
    this.destroyable.writeInitialMessageToCommunicationHistory(this.sender, this.recipient, this.subject, this.body, this.notbefore, this.notafter, this.backreference).then(
      this.onInitialWritten.bind(this),
      this.reject.bind(this)
    );
  };
  SingleMessageSenderJob.prototype.onInitialWritten = function (res) {
    if (!this.okToProceed()) {
      return;
    }
    this.sendingid = res.id;
    (new mylib.SingleMessageFromRecordSender(this.destroyable, res)).go().then(
      this.onFromRecordSender.bind(this),
      this.reject.bind(this)
    );
  };
  SingleMessageSenderJob.prototype.onFromRecordSender = function (res) {
    this.resolve({
      id: this.sendingid,
      sent: res
    });
  };

  mylib.SingleMessageSenderJob = SingleMessageSenderJob;

}
module.exports = createSingleMessageSenderJob;
