sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.Incidents", {

        onInit: function () {
            that.component = this.getOwnerComponent().getRouter().initialize();
            var oTable = this.byId("Incidents");
            oTable.setModel(this.getView().getModel());
        },

        onAddPress: function () {
            this.openDialog(undefined, "Add");
        },
        onAfterRendering: function () {
            this.readdata()
        },
        onrefreshPress: function () {
            this.readdata();
        },
        readdata: function () {
            var oModel = this.getView().getModel();
            var oFilter = new sap.ui.model.Filter("taskType", sap.ui.model.FilterOperator.EQ, "INC");

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
            var oTable = this.byId("Incidents");
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
            this.getView().setModel(oModel, "IncidentModel");

            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(
                    "com.taskmanagement.taskmanagement.Fragment.IncidentDialog",
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

            this.oDialog.bindElement("IncidentModel>/");

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
            var oEntry = this.getView().getModel("IncidentModel").getData();
            var oModel = this.getView().getModel();

            oEntry.onHoldcheck = sap.ui.getCore().byId("IcrOnHold").getSelected() ? "Y" : "N";
            var oVistex = sap.ui.getCore().byId("IcrVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

            oEntry.updateDate = new Date();
            const { isEditable, ...payload } = oEntry;


            oModel.update("/TaskManagement(" + oEntry.number + ")", payload, {
                success: function () {
                    MessageToast.show("Incidents updated successfully");
                    this.oDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });

        },
        onCreatePress: function () {
            var oEntry = this.getView().getModel("IncidentModel").getData();
            var oModel = this.getView().getModel();

         
            var aRequiredFields = [
                { id: "IcrNumber", value: oEntry.number, name: "Number" },
                { id: "incidents", value: oEntry.changeRequest, name: "Incidents" },
                { id: "IcrType", value: oEntry.type, name: "Type" },
                { id: "IcrStatus", value: oEntry.status, name: "Status" },
                { id: "IcrBA", value: oEntry.BA, name: "BA" },
                { id: "IcrAssignedTo", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "IcrDescription", value: oEntry.description, name: "Description" }
            ];

            var bValid = true;
            aRequiredFields.forEach(function (field) {
                var oControl = sap.ui.getCore().byId(field.id);
                if (!field.value || field.value.toString().trim() === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(field.name + " is required");
                    bValid = false;
                } else {
                    oControl.setValueState("None");
                }
            });

            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }

            
            oEntry.onHoldcheck = sap.ui.getCore().byId("IcrOnHold").getSelected() ? "Y" : "N";
            var oVistex = sap.ui.getCore().byId("IcrVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

            oEntry.number = parseInt(oEntry.number, 10);
            var oDatePicker = sap.ui.getCore().byId("ICreateDate");
            if (oDatePicker.getDateValue()) {
                oEntry.createDate = oDatePicker.getDateValue();
            }
            oEntry.updateDate = new Date();
            oEntry.taskType = "INC"; 

         
            oModel.create("/TaskManagement", oEntry, {
                success: function () {
                    MessageToast.show("Incident created successfully");
                    this.oDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Creation failed");
                }
            });
        },
        // onCreatePress: function () {
        //     var oEntry = this.getView().getModel("IncidentModel").getData();
        //     var oModel = this.getView().getModel();
        //     oEntry.onHoldcheck = sap.ui.getCore().byId("IcrOnHold").getSelected() ? "Y" : "N";

        //     var oVistex = sap.ui.getCore().byId("IcrVistex").getSelectedButton();
        //     oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

        //     oEntry.number = parseInt(oEntry.number, 10);
        //     var oDatePicker = sap.ui.getCore().byId("ICreateDate");
        //     if (oDatePicker.getDateValue()) {
        //         oEntry.createDate = oDatePicker.getDateValue();
        //     }

        //     // oEntry.createDate = new Date();
        //     oEntry.updateDate = new Date();
        //     oEntry.taskType = "INC"

        //     oModel.create("/TaskManagement", oEntry, {
        //         success: function (odata) {
        //             MessageToast.show(" Incidents created successfully");
        //             this.oDialog.close();
        //             this.readdata();
        //         }.bind(this),
        //         error: function (err) {
        //             MessageBox.error("Creation failed");
        //         }
        //     });
        // },
        // onDeletePress: function () {
        //     var oTable = this.byId("Incidents");
        //     var oSelected = oTable.getSelectedItem();
        //     if (!oSelected) {
        //         MessageToast.show("Select a record to delete");
        //         return;
        //     }
        //     var sPath = oSelected.getBindingContext("TaskDataModel").getPath();
        //     this.getView().getModel().remove(sPath, {
        //         success: () => { MessageToast.show("Deleted successfully"), this.readdata() },
        //         error: () => MessageBox.error("Delete failed")
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
