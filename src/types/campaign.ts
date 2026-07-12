export interface CampaignMessage {
  id: string;
  phone: string;
  name: string | null;
  message: string;
  status: string;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface CampaignInfo {
  id: string;
  name: string;
  status: string;
  contacts_count: number;
  sent_count: number;
  failed_count: number;
  source: string | null;
  created_at: string;
}

export const CAMPAIGN_MESSAGE_FIELDS = 'id, phone, name, message, status, error, sent_at, created_at' as const;
