sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.ChangeRequest", {

        onInit: function () {
            that.component = this.getOwnerComponent().getRouter().initialize();
            var oTable = this.byId("changeRequestTable");
            oTable.setModel(this.getView().getModel());
        },
        onAfterRendering: function () {
            this.readdata();
        },
        onrefreshPress: function () {
            this.readdata();
        },

        onAddPress: function () {
            this.openDialog(undefined,"Add");
        },
        readdata: function () {
            var oModel = this.getView().getModel();
            var oFilter = new sap.ui.model.Filter("taskType", sap.ui.model.FilterOperator.EQ, "CHG");

            oModel.read("/TaskManagement", {
                filters: [oFilter],
                success: function (oData) {
                    var oJsonModel = new sap.ui.model.json.JSONModel(oData.results);
                    this.getView().setModel(oJsonModel, "TaskDataModel");
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Failed to read Task Management data");
                }
            });
        },

        onEditPress: function () {
            var oTable = this.byId("changeRequestTable");
            var oSelected = oTable.getSelectedItem();
            if (!oSelected) {
                MessageToast.show("Select a record to edit");
                return;
            }
            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            oData.onHoldcheck = oData.onHoldcheck === "Y";
            oData.vistexcheck = oData.vistexcheck === "Yes" ? 0 : 1;
            this.openDialog(oData, "Edit");
        },


        openDialog: function (oData, sMode) {
            var oModel = new sap.ui.model.json.JSONModel(oData || {});
            this.getView().setModel(oModel, "ChangeRequestModel");

            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(
                    "com.taskmanagement.taskmanagement.Fragment.ChangeRequestDialog",
                    this
                );
                this.getView().addDependent(this.oDialog);
            }
            var oBtn = this.oDialog.getBeginButton();
            if (sMode === "Add") {
                oBtn.setText("Save");
                oModel.setData({ isEditable: true });
            } else if (sMode === "Edit") {
                oBtn.setText("Update");
                oModel.setData({ ...oData, isEditable: false });
            }

            this.oDialog.bindElement("ChangeRequestModel>/");

            this.oDialog.open();
        },
        onCreateupdatePress: function (oevent) {
            var btntext = oevent.getSource().getText();
            if (btntext === "Save") {
                this.onCreatePress();
            } else {
                this.onUpdatepress();

            }
        },
        onUpdatepress: function () {
            var oEntry = this.getView().getModel("ChangeRequestModel").getData();
            var oModel = this.getView().getModel();

            oEntry.onHoldcheck = sap.ui.getCore().byId("crOnHold").getSelected() ? "Y" : "N";
            var oVistex = sap.ui.getCore().byId("crVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

            oEntry.updateDate = new Date();
            const { isEditable, ...payload } = oEntry;


            oModel.update("/TaskManagement(" + oEntry.number + ")", payload, {
                success: function () {
                    MessageToast.show("Change Request updated successfully");
                    this.oDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });

        },
        onCreatePress: function () {
            var oEntry = this.getView().getModel("ChangeRequestModel").getData();
            var oModel = this.getView().getModel();
            oEntry.onHoldcheck = sap.ui.getCore().byId("crOnHold").getSelected() ? "Y" : "N";

            var oVistex = sap.ui.getCore().byId("crVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

            oEntry.number = parseInt(oEntry.number, 10);
            var oDatePicker = sap.ui.getCore().byId("crCreateDate");
            if (oDatePicker.getDateValue()) {
                oEntry.createDate = oDatePicker.getDateValue(); 
            }

            // oEntry.createDate = new Date();
            oEntry.updateDate = new Date();
            oEntry.taskType = "CHG"

            oModel.create("/TaskManagement", oEntry, {
                success: function (odata) {
                    MessageToast.show("Change Request created successfully");
                    this.oDialog.close();
                    this.readdata();
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Creation failed");
                }
            });
        },
        // onDeletePress: function () {
        //     var oTable = this.byId("changeRequestTable");
        //     var oSelected = oTable.getSelectedItem();
        //     if (!oSelected) {
        //         MessageToast.show("Select a record to delete");
        //         return;
        //     }
        //     var sPath = oSelected.getBindingContext("TaskDataModel").getPath();
        //     this.getView().getModel().remove(sPath, {
        //         success: () => {
        //             MessageToast.show("Deleted successfully");
        //             this.readdata();
        //         },
        //         error: () => {
        //             MessageBox.error("Delete failed");
        //         }
        //     });
        // },
        onDeletePress: function () {
            var oTable = this.byId("Incidents");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to delete");
                return;
            }
            var oContext = oSelected.getBindingContext("TaskDataModel");
            var oData = oContext.getObject();

            var sPath = "/TaskManagement(" + oData.number + ")";

            var oODataModel = this.getView().getModel();
            oODataModel.remove(sPath, {
                success: () => {
                    MessageToast.show("Deleted successfully");
                    this.readdata();
                },
                error: () => {
                    MessageBox.error("Delete failed");
                }
            });
        },
        onCancelPress: function () {
            this.oDialog.close();
        },
        onpresshome: function () {
            that.component.navTo("RouteView1");
        },
        yesNoFormatter: function (sValue) {
            if (!sValue) return "";
            return sValue === "Y" ? "Yes" : sValue === "N" ? "No" : sValue;
        }
    });
});
