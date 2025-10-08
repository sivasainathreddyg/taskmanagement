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

    return Controller.extend("com.taskmanagement.taskmanagement.controller.PRCDefects", {

        onInit: function () {
            this.router = this.getOwnerComponent().getRouter();
            that.Email = sap.ushell.Container.getService("UserInfo").getEmail();
            // that.Email="test@gmail.com"
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

        onAfterRendering: function () {
            this.readdata();
            this.getemployeename(that.Email)
        },

        onrefreshPress: function () {
            this.readdata();
        },

        readdata: function () {
            var oModel = this.getView().getModel();

            oModel.read("/PRCDefects", {
                success: function (oData) {
                    var oJsonModel = new JSONModel(oData.results);
                    this.getView().setModel(oJsonModel, "TaskDataModel");
                }.bind(this),
                error: function () {
                    MessageBox.error("Failed to read PRC Defects data");
                }
            });
        },

        onAddPress: function () {
            this.openDialog({}, "Add");
        },

        onEditPress: function () {
            var oTable = this.byId("PRCDefectsTable");
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
            this.getView().setModel(oModel, "PRCDefectsModel");

            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(
                    "com.taskmanagement.taskmanagement.Fragment.PRCDefectsDialog",
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

            this.oDialog.open();
        },

        onCreateupdatePress: function (oEvent) {
            var sText = oEvent.getSource().getText();
            if (sText === "Save") {
                this.onCreatePress();
            } else {
                this.onCreatePress();
            }
        },

        // onCreatePress: function () {
        //     var oEntry = this.getView().getModel("PRCDefectsModel").getData();
        //     var oModel = this.getView().getModel();

        //     // set created date from DatePicker (if available)
        //     var oDatePicker = sap.ui.getCore().byId("createdDateInput");
        //     if (oDatePicker && oDatePicker.getDateValue()) {
        //         oEntry.createdDate = oDatePicker.getDateValue();
        //     } else {
        //         oEntry.createdDate = new Date();
        //     }
        //     const { isEditable, ...payload } = oEntry;
        //     oModel.create("/PRCDefects", payload, {
        //         success: function () {
        //             MessageToast.show("PRC Defect created successfully");
        //             this.oDialog.close();
        //             this.readdata();
        //         }.bind(this),
        //         error: function () {
        //             MessageBox.error("Creation failed");
        //         }
        //     });
        // },

        onCreatePress: function () {
            var oEntry = this.getView().getModel("PRCDefectsModel").getData();
            oEntry.createdUser =  that.empname;
            var oModel = this.getView().getModel();

            // --- Required fields ---
            var aRequiredFields = [
                { id: "idInput", value: oEntry.id, name: "ID" },
                { id: "titleInput", value: oEntry.title, name: "Title" },
                { id: "descriptionInput", value: oEntry.description, name: "Description" },
                { id: "assignedToInput", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "priorityInput", value: oEntry.priority, name: "Priority" },
                { id: "statusInput", value: oEntry.status, name: "Status" },
                { id: "effortInput", value: oEntry.effort, name: "Effort" },
                { id: "createdDateInput", value: oEntry.createdDate, name: "Created Date" },
                { id: "createdByInput", value: oEntry.createdBy, name: "Created By" }
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

            // --- Prepare additional data ---
            // oEntry.updateDate = new Date();

            // Remove any internal fields like isEditable
            const { isEditable, ...payload } = oEntry;

            // --- Create or Update OData entry ---
            if (this.oDialog.getBeginButton().getText() === "Save") {
                // Create
                oModel.create("/PRCDefects", payload, {
                    success: function () {
                        MessageToast.show("PRCDefects created successfully");
                        this.oDialog.close();
                        this.readdata();
                    }.bind(this),
                    error: function () {
                        MessageBox.error("Creation failed");
                    }
                });
            } else {
                // Update
                oModel.update("/PRCDefects(" + oEntry.id + ")", payload, {
                    success: function () {
                        MessageToast.show("PRCDefects updated successfully");
                        this.oDialog.close();
                        this.readdata();
                    }.bind(this),
                    error: function () {
                        MessageBox.error("Update failed");
                    }
                });
            }
        },

        onUpdatePress: function () {
            var oEntry = this.getView().getModel("PRCDefectsModel").getData();
            var oModel = this.getView().getModel();

            // remove unwanted transient props
            const { isEditable, ...payload } = oEntry;

            oModel.update("/PRCDefects(" + oEntry.id + ")", payload, {
                success: function () {
                    MessageToast.show("PRC Defect updated successfully");
                    this.oDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });
        },

        onDeletePress: function () {
            var oTable = this.byId("PRCDefectsTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to delete");
                return;
            }

            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            var sPath = "/PRCDefects(" + oData.id + ")";

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
