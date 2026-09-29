const admin = require("firebase-admin");
admin.initializeApp();

const { onUserProfileWrite, setUserRole } = require("./auth");
exports.onUserProfileWrite = onUserProfileWrite;
exports.setUserRole = setUserRole;

const { renderContractorProfile } = require("./ssr");
exports.renderContractorProfile = renderContractorProfile;
