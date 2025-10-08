sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.View1", {

        onInit() {
            that.component = this.getOwnerComponent().getRouter().initialize();
            var oComponent = this.getOwnerComponent();
            that.oGmodel = oComponent.getModel("oGModel");

        },
        onEmployeesPress: function () {
            that.component.navTo("Employeemanagement");
        },
        onIncidentsPress: function () {
            that.component.navTo("Incidents");
        },
        onChangeRequestPress: function () {
            that.component.navTo("ChangeRequest");
        },
        onPRCDefectsPress: function () {
            that.component.navTo("PRCDefects")
        },
        onProjectsPress: function () {
            that.component.navTo("Projects");
        },
        onDashboardPress: function () {
            that.component.navTo("Dashboard");
        }


    });
});