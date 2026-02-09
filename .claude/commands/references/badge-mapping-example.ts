// Example: Mapping order status to UI badge semantic variant and pt-BR label.

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type OrderStatus = 'CREATED' | 'PAID' | 'PICKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';

export interface BadgeModel {
  labelPtBr: string;
  variant: BadgeVariant;
}

/** Maps an order status to a semantic badge configuration for the UI. */
export function mapOrderStatusToBadge(status: OrderStatus): BadgeModel {
  switch (status) {
    case 'DELIVERED':
      return { labelPtBr: 'Entregue', variant: 'success' };
    case 'SHIPPED':
      return { labelPtBr: 'Enviado', variant: 'info' };
    case 'PAID':
      return { labelPtBr: 'Pago', variant: 'info' };
    case 'PICKING':
      return { labelPtBr: 'Em separação', variant: 'warning' };
    case 'CREATED':
      return { labelPtBr: 'Criado', variant: 'neutral' };
    case 'CANCELED':
      return { labelPtBr: 'Cancelado', variant: 'danger' };
    default:
      return { labelPtBr: 'Status desconhecido', variant: 'neutral' };
  }
}
