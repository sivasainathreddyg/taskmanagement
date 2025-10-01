/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["com/taskmanagement/taskmanagement/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
