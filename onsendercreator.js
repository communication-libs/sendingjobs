function createJobOnSender (lib, mylib) {
  'use strict';

  var qlib = lib.qlib,
    JobOnDestroyable = qlib.JobOnDestroyable;

  function JobOnSender (sender, defer) {
    JobOnDestroyable.call(this, sender, defer);
  }
  lib.inherit(JobOnSender, JobOnDestroyable);
  JobOnSender.prototype._destroyableOk = function () {
    var ok = JobOnDestroyable.prototype._destroyableOk.call(this);
    if (!ok) {
      return ok;
    }
    return lib.isArray(this.destroyable.senderlibs) && this.destroyable.jobs;
  };

  mylib.JobOnSender = JobOnSender;
}
module.exports = createJobOnSender;
