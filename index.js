function createJobs (execlib) {
  'use strict';

  var lib = execlib.lib,
    ret = {};

  require('./onsendercreator')(lib, ret);
  require('./singlecreator')(lib, ret);
  require('./singlefromrecordcreator')(execlib, ret);
  require('./singleonlibcreator')(lib, ret);
  require('./historycheckerforsendingcreator')(lib, ret);

  return ret;
}
module.exports = createJobs;
