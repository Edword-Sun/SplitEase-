export interface User {
  id: string;
  name: string;
  account_name: string;
  email: string;
  phone_number: string;
  create_time: string;
  update_time: string;
}

export interface Trip {
  id: string;
  name: string;
  description: string;
  creator: string;
  members: string[]; // List of user IDs
  create_time: string;
  update_time: string;
}

export interface Bill {
  id: string;
  name: string;
  description: string;
  category: number;
  cost_cent: number; // in cents (角)
  trip_id: string;
  team_id: string;
  creator: string;
  involved_members?: string[];
  payer_id: string;
  create_time: string;
  update_time: string;
}

export interface SplitResult {
  from: string;
  to: string;
  amount_cent: number;
}

export interface SplitResponseData {
  avg_costs: string;
  details: string[];
  total_costs: string;
  trip_name: string;
  bill_details: {
    bill_name: string;
    payer_name: string;
    total_costs: string;
    splits: {
      name: string;
      share: string;
    }[];
  }[];
}
