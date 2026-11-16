using {em} from '../db/schema';
service EquipmentManagement{
    entity Equipment as projection on em.Equipment actions{
        action reportBreakDown() returns MaintenanceRequest;
    };
    entity EquipmentLocation as projection on em.EquipmentLocation;
    entity MaintenancePlan as projection on em.MaintenancePlan actions{
        action createPreventiveOrder() returns WorkOrder;
    };
    entity MaintenanceRequest as projection on em.MaintenanceRequest actions{
        action ApproveRequest(ID:UUID);
        action RejectRequest(ID:UUID);
    };
    entity WorkOrder as projection on em.WorkOrder actions{
        action ApproveWork(ID:UUID);
        action RejectWork(ID:UUID);
        action releaseOrder();
    };

    entity WorkOrderOperation as projection on em.WorkOrderOperation actions{
        action assignTechnician(technicianID : UUID, workID: UUID) returns TechnicianAssignment;
    };
    entity Technician as projection on em.Technician;
    entity TechnicianAssignment as projection on em.TechnicianAssignment actions{
        action TechnicianAccept();
    };
    entity SparePart as projection on em.SparePart;
    entity PartConsumption as projection on em.PartConsumption;
    entity DowntimeEvent as projection on em.DowntimeEvent;
    entity TimeConfirmation as projection on em.TimeConfirmation;
}