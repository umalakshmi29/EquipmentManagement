namespace em;
using {cuid} from '@sap/cds/common';


entity Equipment: cuid{
    equipmentID: String;
    equipmentName: String;
    category: String;
    modelNumber: String;
    critical: Criticality;
    equipmentStatus: EStatus;
    warrantyStart: Date;
    warrantyEnd: Date;
    installationDate: Date;
    purchaseDate: Date;
    lastMaintainenceDate: Date;
    nextMaintainenceDate: Date;
    location: Association to EquipmentLocation;
}

type Criticality: String enum{
    LOW;
    MEDIUM;
    HIGH;
    CRITICAL;
}
 
type EStatus: String enum{
    ACTIVE;
    INACTIVE;
    UNDER_MAINTENANCE;
}

entity EquipmentLocation: cuid{
    locationID: String;
    locationName: String;
    plantCode: String;
    floor: String;
    section: String;
    isActive: Boolean;
}

entity MaintenancePlan: cuid{
    planID: String;
    planName: String;
    schedulingType: Schedule;
    intervalValue: Integer;
    gracePeriod: Integer;
    isActive: Boolean;
    equipment: Association to Equipment;
}

entity MaintenanceRequest: cuid{
    requestID: String;
    requestType: RequestType;
    priority: Criticality;
    safetyImpact: Boolean;
    productImpact: Criticality;
    requestStatus: RequestStatus;
}

type Schedule: String enum{
    TIME_BASED;
    USAGE_BASED;
}
 
type RequestType: String enum{
    BREAKDOWN;
    CORRECTIVE;
    PREVENTIVE;
}

type RequestStatus: String enum{
    SUBMITTED;
    UNDER_REVIEW;
    APPROVED;
    REJECTED;
    CANCELLED;
}

entity WorkOrder: cuid{
    orderID: String;
    orderType: RequestType;
    priority: Criticality;
    plannedHours: Decimal;
    actualHours: Decimal;
    estimatedCost: Decimal;
    actualCost: Decimal;
    approvalStatus: Status;
    completedAt: Timestamp;
    closedAt: Timestamp;
    planner: Association to Technician;
    equipment: Association to Equipment;
    operations : Composition of many WorkOrderOperation
                 on operations.workOrder = $self;

}

type Status: String enum{
    PENDING;
    APPROVED;
    REJECTED;
    NOT_REQUIRED;
}

entity WorkOrderOperation: cuid{
    operationID: String;
    operationName: String;
    operationType: OperationType;
    plannedHours: Decimal;
    actualHours: Decimal;
    operationStatus: OperationStatus;
    planStart: Timestamp;
    planEnd: Timestamp;
    findings: LargeString;
    workOrder: Association to WorkOrder;
}

type OperationType: String enum{
    INSPECTION;
    REPAIR;
    TESTING;
}

type OperationStatus: String enum{
    PENDING;
    IN_PROGRESS;
    COMPLETED;
    SKIPPED;
}

entity Technician: cuid{
    empCode: String;
    name: String;
    email: String;
    phone: String;
    availableStatus: Available;
    skillLevel: Level;
    specialization: String;
    isActive: Boolean;
}

type Level: String enum{
    JUNIOR;
    SENIOR;
    EXPERT;
}

type Available: String enum{
    AVAILABLE;
    BUSY;
    ON_LEAVE;
}

entity TechnicianAssignment: cuid{
    assignementID: String;
    assignedAt: Timestamp;
    assignedBy: String;
    assignmentStatus: AssignmentStatus;
    remarks: String;
    technician: Association to Technician;
}

type AssignmentStatus: String enum{
    ASSIGNED;
    ACCEPTED;
    IN_PROGRESS;
    COMPLETED;
    REASSIGNED;
}

entity SparePart: cuid{
    partID: String;
    partName: String;
    category: Category;
    availableQuantity: Decimal;
    reservedQuantity: Decimal;
    unitPrice: Decimal;
    currency: Currency;
    storageLocation: String;
    isActive: Boolean;
}

type Category: String enum{
    ELECTRICAL;
    MECHANICAL;
}

type Currency: String enum{
    INR;
    USD;
    EUR;
}

entity PartConsumption: cuid{
    consumptionID: String;
    consumedQuantity: Decimal;
    unitPrice: Decimal;
    totalCost: Decimal;
    comsumptionStatus: ConsumptionStatus;
    consumedBy: Association to Technician;
    workOrder: Association to WorkOrder;
    operation: Association to WorkOrderOperation;
    spare: Association to SparePart;
}

type ConsumptionStatus: String enum{
    RESERVED;
    CONSUMED;
    RETURNED;
}

entity DowntimeEvent: cuid{
    eventID: String;
    downTimeType: DownType;
    startDate: Date;
    endDate: Date;
    duration: Decimal;
    reason: LargeString;
    impactLevel: Criticality;
}

type DownType: String enum{
    BREAKDOWN;
    PLANNED_MAINTENANCE;
}

entity TimeConfirmation: cuid{
    confirmationID: String;
    workDate: Date;
    startTime: Timestamp;
    endTime: Timestamp;
    findings: LargeString;
}