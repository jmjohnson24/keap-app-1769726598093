'use client';

import { useState, useEffect } from 'react';
import { keapAPI, Contact, Note } from '@/lib/keap';

type Tab = 'contacts' | 'add' | 'edit';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newNote, setNewNote] = useState('');
  
  const [formData, setFormData] = useState({
    given_name: '',
    family_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await keapAPI.getContacts({ page_size: 100 });
      setContacts(response.contacts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async (contactId: number) => {
    try {
      const response = await keapAPI.getNotes(contactId);
      setNotes(response.notes || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const contactData: Contact = {
        given_name: formData.given_name,
        family_name: formData.family_name,
        email_addresses: formData.email ? [{ email: formData.email, field: 'EMAIL1' }] : [],
        phone_numbers: formData.phone ? [{ number: formData.phone, field: 'PHONE1' }] : [],
        addresses: formData.address ? [{
          line1: formData.address,
          locality: formData.city,
          region: formData.state,
          zip_code: formData.zip,
          field: 'BILLING'
        }] : []
      };

      if (activeTab === 'edit' && selectedContact?.id) {
        await keapAPI.updateContact(selectedContact.id, contactData);
        if (formData.notes) {
          await keapAPI.createNote({
            contact_id: selectedContact.id,
            title: 'Pool Service Notes',
            body: formData.notes
          });
        }
      } else {
        const newContact = await keapAPI.createContact(contactData);
        if (formData.notes && newContact.id) {
          await keapAPI.createNote({
            contact_id: newContact.id,
            title: 'Pool Service Notes',
            body: formData.notes
          });
        }
      }

      resetForm();
      setActiveTab('contacts');
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      given_name: contact.given_name || '',
      family_name: contact.family_name || '',
      email: contact.email_addresses?.[0]?.email || '',
      phone: contact.phone_numbers?.[0]?.number || '',
      address: contact.addresses?.[0]?.line1 || '',
      city: contact.addresses?.[0]?.locality || '',
      state: contact.addresses?.[0]?.region || '',
      zip: contact.addresses?.[0]?.zip_code || '',
      notes: ''
    });
    if (contact.id) {
      await loadNotes(contact.id);
    }
    setActiveTab('edit');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    setLoading(true);
    try {
      await keapAPI.deleteContact(id);
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedContact?.id) return;
    
    try {
      await keapAPI.createNote({
        contact_id: selectedContact.id,
        title: 'Pool Service Notes',
        body: newNote
      });
      setNewNote('');
      await loadNotes(selectedContact.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    }
  };

  const resetForm = () => {
    setFormData({
      given_name: '',
      family_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      notes: ''
    });
    setSelectedContact(null);
    setNotes([]);
  };

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (contact.given_name?.toLowerCase().includes(searchLower)) ||
      (contact.family_name?.toLowerCase().includes(searchLower)) ||
      (contact.email_addresses?.[0]?.email?.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-blue-900 mb-8 text-center">
          🏊‍♂️ Pool Maintenance CRM
        </h1>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b">
          <button
            onClick={() => { setActiveTab('contacts'); resetForm(); }}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'contacts'
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📋 Contacts
          </button>
          <button
            onClick={() => { setActiveTab('add'); resetForm(); }}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            ➕ Add Contact
          </button>
          {activeTab === 'edit' && (
            <button
              className="px-6 py-3 font-medium rounded-t-lg bg-green-600 text-white border-b-2 border-green-600"
            >
              ✏️ Edit Contact
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Contacts List */}
        {activeTab === 'contacts' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading contacts...</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {contact.given_name} {contact.family_name}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => contact.id && handleDelete(contact.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    {contact.email_addresses?.[0] && (
                      <p className="text-gray-600 text-sm mb-1">
                        📧 {contact.email_addresses[0].email}
                      </p>
                    )}
                    
                    {contact.phone_numbers?.[0] && (
                      <p className="text-gray-600 text-sm mb-1">
                        📞 {contact.phone_numbers[0].number}
                      </p>
                    )}
                    
                    {contact.addresses?.[0] && (
                      <p className="text-gray-600 text-sm">
                        🏠 {contact.addresses[0].line1}, {contact.addresses[0].locality}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredContacts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No contacts found matching your search.' : 'No contacts yet. Add your first contact!'}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Contact Form */}
        {(activeTab === 'add' || activeTab === 'edit') && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {activeTab === 'edit' ? '✏️ Edit Contact' : '➕ Add New Contact'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.given_name}
                    onChange={(e) => setFormData({ ...formData, given_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.family_name}
                    onChange={(e) => setFormData({ ...formData, family_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pool Service Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Pool type, service frequency, special instructions, chemicals used, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : (activeTab === 'edit' ? 'Update Contact' : 'Add Contact')}
                </button>
                
                <button
                  type="button"
                  onClick={() => { setActiveTab('contacts'); resetForm(); }}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Notes Section for Edit Mode */}
            {activeTab === 'edit' && selectedContact && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4">📝 Service Notes</h3>
                
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a new service note..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={addNote}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 p-3 rounded-md">
                      <p className="text-gray-800">{note.body}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {note.date_created && new Date(note.date_created).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No service notes yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}