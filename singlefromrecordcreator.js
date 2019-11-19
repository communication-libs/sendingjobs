function createSingleMessageFromRecordSender (execlib, mylib) {
  'use strict';

  var lib = execlib.lib,
    qlib = lib.qlib,
    JobOnSender = mylib.JobOnSender;

  function SingleMessageFromRecordSender (sender, mailhistoryrec, defer) {
    JobOnSender.call(this, sender, defer);
    this.mailhistoryrec = mailhistoryrec;
    this.senderlibindex = -1;
  };
  lib.inherit(SingleMessageFromRecordSender, JobOnSender);
  SingleMessageFromRecordSender.prototype.destroy = function () {
    this.senderlibindex = null;
    this.mailhistoryrec = null;
    JobOnSender.prototype.destroy.call(this);
  };
  SingleMessageFromRecordSender.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    this.checkOnTimeBoundaries();
    return ok.val;
  };
  SingleMessageFromRecordSender.prototype.checkOnTimeBoundaries = function () {
    if (!this.okToProceed()) {
      return;
    }
    if (this.mailhistoryrec.notsendbefore && this.mailhistoryrec.notsendbefore>Date.now()) {
      this.resolve(true);
      return;
    }
    if (this.mailhistoryrec.notsendafter && this.mailhistoryrec.notsendafter<Date.now()) {
      this.destroyable.markCommunicationHistoryAsAbandonedDueToExpire(this.mailhistoryrec.id).then(
        this.resolve.bind(this, false),
        this.reject.bind(this)
      );
      return;
    }
    this.checkBlacklist();
  };
  SingleMessageFromRecordSender.prototype.checkBlacklist = function () {
    if (!this.okToProceed()) {
      return;
    }
    this.destroyable.checkBlacklistForRecipient(this.mailhistoryrec.to).then(
      this.onBlacklistChecked.bind(this),
      this.reject.bind(this)
    );
  };
  SingleMessageFromRecordSender.prototype.onBlacklistChecked = function (recipient) {
    if (recipient) {
      this.destroyable.markCommunicationHistoryAsAbandonedDueToBlacklist(this.mailhistoryrec.id).then(
        this.resolve.bind(this, false),
        this.reject.bind(this)
      );
      return;
    }
    this.chooseSenderLib();
  };
  SingleMessageFromRecordSender.prototype.chooseSenderLib = function () {
    var libcnt;
    if (!this.okToProceed()) {
      return;
    }
    this.senderlibindex++;
    if (this.senderlibindex>=this.destroyable.senderlibs.length) {
      this.handleFinalError();
      return;
    }
    this.loadSenderLib(this.destroyable.senderlibs[this.senderlibindex]);
  };
  SingleMessageFromRecordSender.prototype.loadSenderLib = function (libdesc) {
    if (!this.okToProceed()) {
      return;
    }
    var libname, libprophash;
    if (lib.isString(libdesc)) {
      libname = libdesc;
      libprophash = null;
    } else if (lib.isString(libdesc.modulename)) {
      libname = libdesc.modulename;
      libprophash = libdesc.propertyhash;
    } else {
      //this.reject(new lib.Error('INVALID_MAILING_LIB_DESC', 'Invalid mail sender library descriptor '+JSON.stringify(libdesc, null, 2)));
      console.error('Invalid mail sender library descriptor', libdesc);
      this.chooseSenderLib();
      return;
    }
    execlib.loadDependencies('client', [libname], this.onSenderLib.bind(this, libname, libprophash)).then(null, this.reject.bind(this));
    libname = null;
    libprophash = null;
  };
  SingleMessageFromRecordSender.prototype.onSenderLib = function (libname, libprophash, senderlib) {
    if (!this.okToProceed()) {
      return;
    }
    if (!senderlib) {
      this.reject(new lib.Error('NO_MAILING_LIB', 'Messageing module '+libname+' does not resolve in an object'));
      return;
    }
    if (!lib.isFunction(senderlib.mailer)) {
      this.reject(new lib.Error('NO_MAILING_LIB_SENDER', 'Messageing module '+libname+' does not resolve in an object with the "sender" Class'));
      return;
    }
    (new mylib.SingleMessageSenderOnLib(this.destroyable, this.mailhistoryrec, senderlib.mailer, libprophash)).go().then(
      this.resolve.bind(this),
      this.chooseSenderLib.bind(this),
      this.notify.bind(this)
    );
  };
  SingleMessageFromRecordSender.prototype.handleFinalError = function () {
    if (!this.okToProceed()) {
      return;
    }
    this.destroyable.markCommunicationHistoryAsError(this.mailhistoryrec.id).then(
      this.reportFinalError.bind(this),
      this.reject.bind(this)
    ); 
  };
  SingleMessageFromRecordSender.prototype.reportFinalError = function () {
    if (!this.okToProceed()) {
      return;
    }
    this.destroyable.getSendingErrorsFromCommunicationHistory(this.mailhistoryrec.id).then(
      this.onSendingErrors.bind(this),
      this.reject.bind(this)
    );
  };
  SingleMessageFromRecordSender.prototype.onSendingErrors = function (errors) {
    var err;
    if (!(lib.isArray(errors) && errors.length>0)) {
      this.reject(new lib.Error('NO_MORE_MAILING_LIBS_TO_TRY', 'All '+this.destroyable.senderlibs.length+' mailing libraries were tried to no avail'));
      return;
    }
    if (errors.length===1) {
      err = errors[0];
      this.reject(new lib.Error('MAILER_SENDING_ERROR', err.sendingsystem+'\n'+err.code+':'+err.message));
      return;
    }
    this.reject(new lib.Error('MULTIPLE_MAILER_SENDING_ERRORS', JSON.stringify(errors)));
  };

  mylib.SingleMessageFromRecordSender = SingleMessageFromRecordSender;
}
module.exports = createSingleMessageFromRecordSender;

