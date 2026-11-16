const cds = require('@sap/cds');
const { SELECT, UPDATE, INSERT } = require('@sap/cds/lib/ql/cds-ql');

module.exports = cds.service.impl(async function () {
    const { Equipment, EquipmentLocation, MaintenancePlan, MaintenanceRequest, Technician, WorkOrder, WorkOrderOperation, TechnicianAssignment, SparePart, PartConsumption, TimeConfirmation } = this.entities;

    //-------------------------------------------Equipment-------------------------------------------//
    this.before('CREATE', Equipment, async (req) => {
        const { equipmentName, category, modelNumber, critical, equipmentStatus, warrantyStart, warrantyEnd } = req.data;
        console.log(req.data);

        if (!equipmentName || !category || !modelNumber || !critical || !equipmentStatus || !warrantyStart || !warrantyEnd) {
            return req.error(400, 'Please Fill All The Mandatory Fields')
        }
        const equipID = await SELECT.one.from(Equipment)
            .columns('equipmentID')
            .orderBy('equipmentID desc');
        let nextNumber = 1;
        if (equipID?.equipmentID) {
            const lastNumber = parseInt(equipID.equipmentID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.equipmentID = `EQ-${String(nextNumber).padStart(3, "0")}`;

        if (warrantyStart && warrantyEnd && warrantyEnd < warrantyStart) {
            return req.error(400, 'Warranty End Date cannot be before Warranty Start Date');
        }

        const status = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (req.data.critical && !status.includes(req.data.critical)) {
            return req.error(400, 'Invalid Value')
        }

        const estatus = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'];
        if (req.data.equipmentStatus && !estatus.includes(req.data.equipmentStatus)) {
            return req.error(400, 'Invalid Equipment Status Value');
        }

        const location = req.data.location_ID;
        const locationID = await SELECT.one.from(EquipmentLocation).where({ locationID: location });
        if (!locationID.isActive) {
            return req.error(400, 'Selected location is not active')
        }
    });

    this.before('UPDATE', Equipment, async (req) => {
        const equipmentID = req.data.ID || req.params?.[0]?.ID;
        const { equipmentName, category, modelNumber, critical, equipmentStatus, warrantyStart, warrantyEnd } = req.data;

        const equipment = await SELECT.one.from(Equipment)
            .where({ ID: equipmentID });
        if (!equipment) {
            return req.error(400, 'EquipmentID does not exists')
        }
        if (warrantyStart && warrantyEnd && warrantyEnd < warrantyStart) {
            return req.error(400, 'Warranty End Date cannot be before Warranty Start Date');
        }

        const location = req.data.location_ID;
        const locationID = await SELECT.one.from(EquipmentLocation).where({ locationID: location });
        if (!locationID.isActive) {
            return req.error(400, 'Selected location is not active')
        }
    });

    //------------------------------Report Breakdown - Action --------------------------------------------//
    this.on('reportBreakDown', Equipment, async (req) => {
        const { ID } = req.params[0];
        const equipment = await SELECT.one.from(Equipment)
            .where({ ID });
        if (!equipment) {
            return req.error(404, 'Selected Equipment not found');
        }
        if (equipment.equipmentStatus !== 'ACTIVE') {
            return req.error(400, 'Only Active equipment can be selected');
        }
        const last = await SELECT.one.from(MaintenanceRequest)
            .columns('requestID')
            .orderBy('requestID desc');
        const next = last?.requestID ? parseInt(last.requestID.split("-")[1], 10) + 1 : 1;
        const requestUUID = cds.utils.uuid();
        await INSERT.into(MaintenanceRequest).entries({
            ID: requestUUID,
            requestID: `REQ-${String(next).padStart(3, "0")}`,
            requestType: 'BREAKDOWN',
            requestStatus: 'SUBMITTED',
            equipment_ID: ID
        })
        return SELECT.one.from(MaintenanceRequest).where({ ID: requestUUID });
    })


    //------------------------------------------------Equipment Location-------------------------------------------------//
    this.before('CREATE', EquipmentLocation, async (req) => {
        const location = await SELECT.one.from(EquipmentLocation)
            .columns('locationID')
            .orderBy('locationID desc');
        let nextNumber = 1;
        if (location?.locationID) {
            const lastNumber = parseInt(location.locationID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.locationID = `LOC-${String(nextNumber).padStart(3, "0")}`;
    });

    // //-------------------------------------------Maintenance Plan-------------------------------------------------//
    // this.before('CREATE', MaintenancePlan, async (req) => {
    //     const equipment = req.data.equipment_ID;
    //     if (!equipment) {
    //         return req.error(400, 'Please select an Equipment')
    //     }
    //     const equip = await SELECT.one.from(Equipment)
    //         .where({ equipmentID: equipment })
    //     console.log(equip);

    //     if (!equip) {
    //         return req.error(404, 'Selected Equipment ID does not exist');
    //     }
    //     if (equip.equipmentStatus !== 'ACTIVE') {
    //         return req.error(404, 'Selected Equipment ID is not active');
    //     }

    //     const plan = await SELECT.one.from(MaintenancePlan)
    //         .columns('planID')
    //         .orderBy('planID desc');
    //     let nextNumber = 1;
    //     if (plan?.planID) {
    //         const lastNumber = parseInt(plan.planID.split("-")[1], 10);
    //         nextNumber = lastNumber + 1;
    //     }
    //     req.data.planID = `PL-${String(nextNumber).padStart(3, "0")}`;
    // });

    //-------------------------Preventive Plan - Action--------------------//
    this.on('createPreventiveOrder', MaintenancePlan, async (req) => {
        const { ID } = req.params[0];
        const plan = await SELECT.one.from(MaintenancePlan)
            .where({ ID });
        if (!plan) {
            return req.error(404, 'Maintenance Plan not found');
        }

        if (!plan.isActive) {
            return req.error(400, 'Maintenance Plan is inactive');
        }
        console.log("Equipment Foreign Key:", plan?.equipment_ID);
        if (!plan.equipment_ID) {
            return req.error(400, 'No Equipment linked to this Maintenance Plan');
        }

        const equipment = await SELECT.one.from(Equipment).where({ equipmentID: plan.equipment_ID });
        console.log(equipment)
        if (!equipment) {
            return req.error(404, 'Equipment not found');
        }
        if (equipment.equipmentStatus !== 'ACTIVE') {
            return req.error(400, 'Selected Equipment must be active');
        }

        const workOrder = await SELECT.one.from(WorkOrder)
            .columns('orderID')
            .orderBy('orderID desc');
        const next = workOrder?.orderID ? parseInt(workOrder.orderID.split("-")[1], 10) + 1 : 1;
        const orderUUID = cds.utils.uuid();
        await INSERT.into(WorkOrder).entries({
            ID: orderUUID,
            orderID: `ORD-${String(next).padStart(3, "0")}`,
            orderType: 'PREVENTIVE',
            approvalStatus: 'PENDING',
            equipment_ID: equipment.ID
        });
        return await SELECT.one.from(WorkOrder).where({ ID: orderUUID })
    })

  
    //----------------------------Maintainenace Request - Approve Action ----------------//
    this.on('ApproveRequest', MaintenanceRequest, async (req) => {
        const { ID } = req.params[0];
        const request = await SELECT.one.from(MaintenanceRequest).where({ ID });
        if (!request) {
            return req.error(404, 'Maintenance request is not found');
        }
        if (request.requestStatus !== 'SUBMITTED') {
            return req.error(400, 'Only Submitted Request can be Approved');
        }
        await UPDATE(MaintenanceRequest).set({ requestStatus: 'APPROVED' })
            .where({ ID });
    })

    //-----------------------------Reject-------------------------//
    this.on('RejectRequest', MaintenanceRequest, async (req) => {
        const { ID } = req.params[0];
        const request = await SELECT.one.from(MaintenanceRequest).where({ ID });
        if (!request) {
            return req.error(404, 'Maintenance request is not found');
        }
        if (requestStatus !== 'SUBMITTED') {
            return req.error(400, 'Only Submitted Request can be Rejected');
        }
        await UPDATE(MaintenanceRequest).set({ requestStatus: 'REJECTED' })
            .where({ ID });
    })


    //------------------------------Technician-----------------------------------//
    this.before('CREATE', Technician, async (req) => {
        const last = await SELECT.one.from(Technician)
            .columns('empCode')
            .orderBy('empCode desc');
        let nextNumber = 1;
        if (last?.empCode) {
            const lastNumber = parseInt(last.empCode.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.empCode = `TECH-${String(nextNumber).padStart(3, "0")}`;

        if (req.data.phone && !/^\d{10}$/.test(req.data.phone)) {
            return req.error(400, 'Please enter a valid phone number');
        }
        if (req.data.email && !/^[a-zA-Z0-9._%+-]+@company\.com$/.test(req.data.email)) {
            return req.error(400, 'Please enter a valid email address');
        }
    });

    //----------------------------------Work Order----------------------//
    this.before('CREATE', WorkOrder, async (req) => {
        const status = req.data.request_ID;
        const request = await SELECT.one.from(MaintenanceRequest)
            .where({ requestID: status });

        if (!request) {
            return req.reject(404, 'Maintenance Request not found');
        }

        if (request.requestStatus !== 'APPROVED') {
            req.reject(400, 'Request must be approved before creating Work Order');
        }

        const work = await SELECT.one.from(WorkOrder)
            .columns('orderID')
            .orderBy('orderID desc');
        let nextNumber = 1;
        if (work?.orderID) {
            const lastNumber = parseInt(work.orderID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.orderID = `ORD-${String(nextNumber).padStart(3, "0")}`;
    });

    this.after('CREATE', WorkOrder, async (data, req) => {
        const request = req.data.request_ID;
        if (!request) return;
        await UPDATE(MaintenanceRequest).set({ requestStatus: 'CREATED' }).where({ requestID: request })
    });

    //--------------------WorkOrder- Approve-----------------//
    this.on('ApproveWork', WorkOrder, async (req) => {
        const { ID } = req.params[0];
        const work = await SELECT.one.from(WorkOrder)
            .where({ ID });
        if (work.approvalStatus !== 'PENDING') {
            return req.error(400, 'Only pending work order can be Approved')
        }
        await UPDATE(WorkOrder).set({ approvalStatus: 'APPROVED' }).where({ ID })
    })

    this.on('RejectWork', WorkOrder, async (req) => {
        const { ID } = req.params[0];
        const work = await SELECT.one.from(WorkOrder)
            .where({ ID });
        if (work.approvalStatus !== 'PENDING') {
            return req.error(400, 'Only pending work order can be Rejected')
        }
        await UPDATE(WorkOrder).set({ approvalStatus: 'REJECTED' }).where({ ID })
    })



    this.before('CREATE', WorkOrderOperation, async (req) => {
        const work = await SELECT.one.from(WorkOrderOperation)
            .columns('operationID')
            .orderBy('operationID desc');
        let nextNumber = 1;
        if (work?.operationID) {
            const lastNumber = parseInt(work.operationID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.operationID = `OP-${String(nextNumber).padStart(3, "0")}`;
        if (req.data.planEnd < req.data.planStart) {
            return req.error(400, 'The Plan end cannot be before plan start')
        }
        if (!req.data.workOrder_ID) {
            return req.error(400, 'Please select a Work Order');
        }
    });

    this.after('CREATE', WorkOrderOperation, async (data, req) => {
        const workOrder = req.data.workOrder_ID;
        console.log(workOrder);
        if (!workOrder) return;
        await UPDATE(WorkOrder).set({ approvalStatus: 'CREATED' }).where({ orderID: workOrder });
    })

    //----------------------Assign Technician - Action --------------------------------//
    this.on('assignTechnician', WorkOrderOperation, async (req) => {
        const { ID } = req.params[0];
        const { technicianID, workID } = req.data;
        const operation = await SELECT.one.from(WorkOrderOperation).where({ ID });
        if (!operation) {
            return req.error(404, 'Work Order Operation not found');
        }
        const work = await SELECT.one.from(WorkOrder)
            .where({ ID: workID });
        console.log(work);
        if (!work) {
            return req.error(404, 'WorkOrder not found');
        }
        if (work.approvalStatus !== 'APPROVED') {
            return req.error(400, 'Only approved workorder can able assign');
        }

        const technician = await SELECT.one.from(Technician)
            .where({ ID: technicianID });
        if (!technician) {
            return req.error(404, 'Technician not found');
        }
        if (technician.availableStatus !== 'AVAILABLE') {
            return req.error(400, 'Please select available technician');
        }

        const assign = await SELECT.one.from(TechnicianAssignment)
            .columns('assignmentID')
            .orderBy('assignmentID desc');
        const last = assign?.assignmentID ? parseInt(assign.assignmentID.split("-")[1], 10) + 1 : 1;
        const assignmentUUID = cds.utils.uuid();
        const nextAssignmentID = `ASN-${String(last).padStart(3, '0')}`;
        await INSERT.into(TechnicianAssignment).entries({
            ID: assignmentUUID,
            assignmentID: nextAssignmentID,
            technician_ID: technicianID,
            workOrder_ID: workID,
            operation_ID: operation.ID,
            assignmentStatus: 'ASSIGNED'
        })
        await UPDATE(WorkOrderOperation)
            .set({ technician_ID: technicianID })
            .where({ ID: operation.ID });
        return SELECT.one.from(TechnicianAssignment).where({ ID: assignmentUUID })
    });

    //----------------Technician Accept - Action -----------------------//
    this.on('TechnicianAccept', TechnicianAssignment, async (req) => {
        const { ID } = req.params[0];
        const technician = await SELECT.one.from(TechnicianAssignment).where({ ID });
        if (technician.assignmentStatus !== 'ASSIGNED') {
            return req.error(400, 'Only assigned order can be accepted');
        }
        await UPDATE(TechnicianAssignment).set({ assignmentStatus: 'ACCEPTED' }).where({ ID });
    });


    this.on('releaseOrder', WorkOrder, async (req) => {
        const { ID } = req.params[0];
        const work = await SELECT.one.from(WorkOrder).where({ ID });
        if (!work) {
            return req.error(404, 'Work order not found');
        }
        if (work.approvalStatus !== 'APPROVED') {
            return req.error(400, "Only approved status can be able to release");
        }

        const operation = await SELECT.one.from(WorkOrderOperation).where({ workOrder_ID: ID });
        if (!operation) {
            return req.error(404, 'Work Order Operation not found')
        }

        const assign = await SELECT.one.from(TechnicianAssignment).where({ operation_ID: operation.ID });
        if (assign.assignmentStatus !== 'ACCEPTED') {
            return req.error(400, 'Only accepted status can be released');
        }
        await UPDATE(WorkOrder)
            .set({ approvalStatus: 'RELEASED' })
            .where({ ID });
        const request = await SELECT.one.from(MaintenanceRequest)
            .where({ ID: work.request_ID });

        if (request?.equipment_ID) {
            await UPDATE(Equipment)
                .set({ equipmentStatus: 'UNDER_MAINTENANCE' })
                .where({ ID: request.equipment_ID });
        }

    })

})
