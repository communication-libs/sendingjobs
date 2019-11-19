function createSingleMessageSenderOnLib (lib, mylib) {
  'use strict';

  var JobOnSender = mylib.JobOnSender,
    qlib = lib.qlib;

  function SingleMessageSenderOnLib (sender, mailhistoryrec, libsenderclass, propertyhash, defer) {
    JobOnSender.call(this, sender, defer);
    this.mailhistoryrec = mailhistoryrec;
    this.libsenderclass = libsenderclass;
    this.propertyhash = propertyhash;
    this.senderinstance = null;
  }
  lib.inherit(SingleMessageSenderOnLib, JobOnSender);
  SingleMessageSenderOnLib.prototype.destroy = function () {
    if (this.senderinstance) {
      this.senderinstance.destroy();
    }
    this.senderinstance = null;
    this.propertyhash = null;
    this.libsenderclass = null;
    this.mailhistoryrec = null;
    JobOnSender.prototype.destroy.call(this);
  };
  SingleMessageSenderOnLib.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    //console.log('would have sent', this.mailhistoryrec, 'via', this.libsenderclass.name);
    this.senderinstance = new this.libsenderclass(this.propertyhash);
    this.senderinstance.send(this.mailhistoryrec).then(
      this.onSuccess.bind(this),
      this.onError.bind(this)
    );
    return ok.val;   
  };
  SingleMessageSenderOnLib.prototype.onSuccess = function (res) {
    if (!this.okToProceed()) {
      return;
    }
    //console.log('SingleMessageSenderOnLib onSuccess', res);
    if (!res.success) {
      this.reject('MAIL_SENDING_FAILED', this.mailhistoryrec.id);
      return;
    }
    this.destroyable.markCommunicationHistoryAsCommited(this.mailhistoryrec.id, this.senderinstance.sendingsystemcode, res.sendingsystemid).then(
      this.resolve.bind(this, true),
      this.reject.bind(this)
    );
  };
  SingleMessageSenderOnLib.prototype.onError = function (err) {
    var rerrorer;
    if (!this.okToProceed()) {
      return;
    }
    rerrorer = this.reject.bind(this, err);
    this.destroyable.writeSendingErrorToCommunicationHistory(this.mailhistoryrec.id, this.senderinstance.sendingsystemcode, err).then(
      rerrorer,
      rerrorer
    );
    rerrorer = null;
    err = null;
  };

  mylib.SingleMessageSenderOnLib = SingleMessageSenderOnLib;
}
module.exports = createSingleMessageSenderOnLib;
