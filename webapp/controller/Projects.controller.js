sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator) {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.Projects", {

        onInit: function () {
            this.router = this.getOwnerComponent().getRouter();
            that.Email = sap.ushell.Container.getService("UserInfo").getEmail();
            // that.Email = "test@gmail.com"
        },

        onAfterRendering: function () {
            this.readdata();
            this.getemployeename(that.Email)
        },
        getemployeename: function (sEmail) {
            var oModel = this.getView().getModel();
            var oFilter = new sap.ui.model.Filter("email", sap.ui.model.FilterOperator.EQ, sEmail);
            oModel.read("/Employee", {
                filters: [oFilter],
                success: function (odata) {
                    if (odata.results.length > 0) {
                        that.empname = odata.results[0].name;
                    }
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Failed to read Employee data");
                }
            })
        },

        onrefreshPress: function () {
            this.readdata();
        },

        readdata: function () {
            var oModel = this.getView().getModel();
            oModel.read("/ProjectManagement", {
                success: function (oData) {
                    var oJsonModel = new JSONModel(oData.results);
                    this.getView().setModel(oJsonModel, "TaskDataModel");
                }.bind(this),
                error: function () {
                    MessageBox.error("Failed to read Project Management data");
                }
            });
        },

        onAddPress: function () {
            this.openDialog({}, "Add");
        },

        onEditPress: function () {
            var oTable = this.byId("projectManagementTable");
            var oSelected = oTable.getSelectedItem();
            if (!oSelected) {
                MessageToast.show("Select a record to edit");
                return;
            }
            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            this.openDialog(oData, "Edit");
        },

        openDialog: function (oData, sMode) {
            var oModel = new JSONModel(oData || {});
            this.getView().setModel(oModel, "ProjectModel");

            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(
                    "com.taskmanagement.taskmanagement.Fragment.ProjectManagementDialog",
                    this
                );
                this.getView().addDependent(this.oDialog);
            }

            var oBtn = this.oDialog.getBeginButton();
            oBtn.setText(sMode === "Add" ? "Save" : "Update");

            this.oDialog.open();
        },

        onCreateupdatePress: function (oEvent) {
            var sText = oEvent.getSource().getText();
            if (sText === "Save") {
                this.onCreatePress();
            } else {
                this.onUpdatePress();
            }
        },

        onCreatePress: function () {

            var oEntry = this.getView().getModel("ProjectModel").getData();
            oEntry.createdUser =  that.empname;
            var oModel = this.getView().getModel();
            var oDatePicker = sap.ui.getCore().byId("plannedStartDateInput");
            if (oDatePicker && oDatePicker.getDateValue()) {
                oEntry.plannedStartDate = oDatePicker.getDateValue();
            } else {
                oEntry.plannedStartDate = new Date();
            }
            var oEDatePicker = sap.ui.getCore().byId("plannedEndDateInput");
            if (oEDatePicker && oEDatePicker.getDateValue()) {
                oEntry.plannedEndDate = oEDatePicker.getDateValue();
            } else {
                oEntry.plannedEndDate = new Date();
            }
            const { isEditable, ...payload } = oEntry;

            oModel.create("/ProjectManagement", payload, {
                success: function () {
                    MessageToast.show("Project created successfully");
                    this.oDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Creation failed");
                }
            });
        },

        onUpdatePress: function () {
            var oEntry = this.getView().getModel("ProjectModel").getData();
            var oModel = this.getView().getModel();

            // Remove transient properties if needed
            const { isEditable, ...payload } = oEntry;

            oModel.update(`/ProjectManagement(projectID=${oEntry.projectID},number=${oEntry.number})`, payload, {
                success: function () {
                    MessageToast.show("Project updated successfully");
                    this.oDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });
        },

        onDeletePress: function () {
            var oTable = this.byId("projectManagementTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to delete");
                return;
            }

            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            var sPath = `/ProjectManagement(projectID=${oData.projectID},number=${oData.number})`;

            this.getView().getModel().remove(sPath, {
                success: function () {
                    MessageToast.show("Deleted successfully");
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Delete failed");
                }
            });
        },

        onCancelPress: function () {
            this.oDialog.close();
        },

        onpresshome: function () {
            this.router.navTo("RouteView1");
        }
    });
});
