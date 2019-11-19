function createHistoryCheckerForSendingJob (lib, mylib) {
  'use strict';

  var qlib = lib.qlib,
    JobOnSender = mylib.JobOnSender;

  function HistoryCheckerForSendingJob (sender, defer) {
    JobOnSender.call(this, sender, defer);
  }
  lib.inherit(HistoryCheckerForSendingJob, JobOnSender);
  HistoryCheckerForSendingJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    this.destroyable.getMessageToSendFromHistory().then(
      this.onRecordToSendFromHistory.bind(this),
      this.reject.bind(this)
    );
    return ok.val;
  };
  HistoryCheckerForSendingJob.prototype.onRecordToSendFromHistory = function (rec) {
    var retriggerer;
    if (!this.okToProceed()) {
      return;
    }
    if (!rec) {
      this.retriggerIn(1*lib.intervals.Minute);
      this.resolve(false);
    }
    (new mylib.SingleMessageFromRecordSender(this.destroyable, rec)).go().then(
      this.onSingleMessageFromRecordSent.bind(this),
      this.reject.bind(this)
    );
  };
  HistoryCheckerForSendingJob.prototype.onSingleMessageFromRecordSent = function (res) {
    this.retriggerIn(1*lib.intervals.Second);
    this.resolve(res);
  };
  HistoryCheckerForSendingJob.prototype.retriggerIn = function (interval) {
    //yes, I can Proceed (or can I?)
    lib.runNext(this.destroyable.checkHistoryForSending.bind(this.destroyable), interval);
  };

  mylib.HistoryCheckerForSendingJob = HistoryCheckerForSendingJob;
}
module.exports = createHistoryCheckerForSendingJob;
