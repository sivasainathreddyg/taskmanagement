sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";
      var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.Employeemanagement", {

        onInit: function () {
            this.router = this.getOwnerComponent().getRouter();
        },

        onAfterRendering: function () {
            this.readdata();
        },

        onrefreshPress: function () {
            this.readdata();
        },

        readdata: function () {
            var oModel = this.getView().getModel();
            oModel.read("/Employee", {
                success: function (oData) {
                    var oJsonModel = new JSONModel(oData.results);
                    this.getView().setModel(oJsonModel, "TaskDataModel");
                }.bind(this),
                error: function () {
                    MessageBox.error("Failed to read Employee data");
                }
            });
        },

        onAddPress: function () {
            this.openDialog({}, "Add");
        },

        onEditPress: function () {
            var oTable = this.byId("employeeTable");
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
            this.getView().setModel(oModel, "EmployeeModel");

            var oModeModel = new sap.ui.model.json.JSONModel({ dialogMode: sMode });
            this.getView().setModel(oModeModel, "dialogMode");

            if (!this.EDialog) {
                this.EDialog = sap.ui.xmlfragment(
                    "com.taskmanagement.taskmanagement.Fragment.EmployeeDialog",
                    this
                );
                this.getView().addDependent(this.EDialog);
            }

            var oBtn = this.EDialog.getBeginButton();
            oBtn.setText(sMode === "Add" ? "Save" : "Update");

            this.EDialog.open();
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
            var oEntry = this.getView().getModel("EmployeeModel").getData();
            var oModel = this.getView().getModel();

            oModel.create("/Employee", oEntry, {
                success: function () {
                    MessageToast.show("Employee created successfully");
                    this.EDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Creation failed");
                }
            });
        },

        onUpdatePress: function () {
            var oEntry = this.getView().getModel("EmployeeModel").getData();
            var oModel = this.getView().getModel();

            const { isEditable, ...payload } = oEntry;

            oModel.update(`/Employee(${oEntry.id})`, payload, {
                success: function () {
                    MessageToast.show("Employee updated successfully");
                    this.EDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });
        },

        onDeletePress: function () {
            var oTable = this.byId("employeeTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to delete");
                return;
            }

            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            var sPath = `/Employee(${oData.id})`;

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
            this.EDialog.close();
        },

        onpresshome: function () {
            this.router.navTo("RouteView1");
        }
    });
});
