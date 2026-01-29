const API_KEY = 'KeapAK-99e0c9ee9da830cb526ec442774ac95e0f1259529534921d9e';
const BASE_URL = 'https://api.infusionsoft.com/crm/rest/v2';

export interface Contact {
  id?: number;
  given_name?: string;
  family_name?: string;
  email_addresses?: EmailAddress[];
  phone_numbers?: PhoneNumber[];
  addresses?: Address[];
  notes?: string;
  custom_fields?: CustomField[];
  date_created?: string;
  last_updated?: string;
}

export interface EmailAddress {
  email: string;
  field: string;
}

export interface PhoneNumber {
  number: string;
  field: string;
}

export interface Address {
  line1?: string;
  line2?: string;
  locality?: string;
  region?: string;
  zip_code?: string;
  country_code?: string;
  field: string;
}

export interface CustomField {
  id: number;
  content: string;
}

export interface Note {
  id?: number;
  contact_id?: number;
  title?: string;
  body?: string;
  date_created?: string;
  last_updated?: string;
}

class KeapAPI {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getContacts(params?: { page_size?: number; page_token?: string; filter?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.page_token) searchParams.append('page_token', params.page_token);
    if (params?.filter) searchParams.append('filter', params.filter);
    
    const query = searchParams.toString();
    return this.request(`/contacts${query ? `?${query}` : ''}`);
  }

  async getContact(id: number) {
    return this.request(`/contacts/${id}`);
  }

  async createContact(contact: Contact) {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  async updateContact(id: number, contact: Partial<Contact>) {
    return this.request(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(contact),
    });
  }

  async deleteContact(id: number) {
    return this.request(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  async getNotes(contactId: number) {
    return this.request(`/notes?filter=contact_id==${contactId}`);
  }

  async createNote(note: Note) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  async updateNote(id: number, note: Partial<Note>) {
    return this.request(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(note),
    });
  }

  async deleteNote(id: number) {
    return this.request(`/notes/${id}`, {
      method: 'DELETE',
    });
  }
}

export const keapAPI = new KeapAPI();