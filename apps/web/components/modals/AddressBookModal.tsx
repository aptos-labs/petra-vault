'use client';

import { useState } from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAddressBook, AddressBookEntry } from '@/context/useAddressBook';
import { useNetwork } from '@aptos-labs/react';
import { toast } from 'sonner';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import AddressBookEntryForm, { AddressBookEntryFormValues } from '../forms/AddressBookEntryForm';
import AddressDisplay from '../AddressDisplay';
import { TrashIcon, Pencil1Icon, PlusIcon } from '@radix-ui/react-icons';
import { AptosAvatar } from 'aptos-avatars-react';

type ModalMode = 'list' | 'add' | 'edit';

interface AddressBookModalProps {
  onClose?: () => void;
}

export default function AddressBookModal({ onClose }: AddressBookModalProps) {
  const { network } = useNetwork();
  const { 
    getEntriesForNetwork, 
    addEntry, 
    updateEntry, 
    removeEntry 
  } = useAddressBook();
  
  const [mode, setMode] = useState<ModalMode>('list');
  const [editingEntry, setEditingEntry] = useState<AddressBookEntry | null>(null);

  const networkEntries = getEntriesForNetwork(network);

  const handleAddEntry = async (values: AddressBookEntryFormValues & { resolvedAddress: AccountAddress }) => {
    try {
      addEntry({
        address: values.resolvedAddress,
        name: values.name,
        network
      });
      toast.success('Address added to address book');
      setMode('list');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add address');
    }
  };

  const handleEditEntry = async (values: AddressBookEntryFormValues & { resolvedAddress: AccountAddress }) => {
    if (!editingEntry) return;
    
    try {
      updateEntry(editingEntry.address, editingEntry.network, values.name);
      toast.success('Address book entry updated');
      setMode('list');
      setEditingEntry(null);
    } catch (error) {
      toast.error('Failed to update entry');
    }
  };

  const handleDeleteEntry = (entry: AddressBookEntry) => {
    try {
      removeEntry(entry.address, entry.network);
      toast.success('Address removed from address book');
    } catch (error) {
      toast.error('Failed to remove address');
    }
  };

  const renderListView = () => (
    <div className="w-full flex flex-col gap-4">
      <DialogHeader className="w-full">
        <DialogTitle>Address Book</DialogTitle>
        <DialogDescription>
          Manage custom names for addresses on {network}
        </DialogDescription>
      </DialogHeader>
      <Separator className="w-full" />
      
      <div className="flex justify-end">
        <Button
          onClick={() => setMode('add')}
          size="sm"
          data-testid="add-address-book-entry-button"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      </div>

      {networkEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">No addresses saved yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add addresses to quickly identify them across the app
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {networkEntries.map((entry) => (
            <div
              key={entry.address.toString()}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <AptosAvatar value={entry.address.toString()} size={32} />
                <div>
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-sm text-muted-foreground">
                    <AddressDisplay 
                      address={entry.address} 
                      truncate={true}
                      disableAnsName={true}
                    />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingEntry(entry);
                    setMode('edit');
                  }}
                  data-testid={`edit-address-book-entry-${entry.address.toString()}`}
                >
                  <Pencil1Icon className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteEntry(entry)}
                  data-testid={`delete-address-book-entry-${entry.address.toString()}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAddView = () => (
    <div className="w-full flex flex-col gap-4">
      <DialogHeader className="w-full">
        <DialogTitle>Add Address</DialogTitle>
        <DialogDescription>
          Add a custom name for an address on {network}
        </DialogDescription>
      </DialogHeader>
      <Separator className="w-full" />
      
      <AddressBookEntryForm
        onSubmit={handleAddEntry}
        actionLabel="Add Address"
      />
      
      <Button
        variant="outline"
        onClick={() => setMode('list')}
        data-testid="cancel-add-address-book-entry-button"
      >
        Cancel
      </Button>
    </div>
  );

  const renderEditView = () => (
    <div className="w-full flex flex-col gap-4">
      <DialogHeader className="w-full">
        <DialogTitle>Edit Address</DialogTitle>
        <DialogDescription>
          Update the custom name for this address
        </DialogDescription>
      </DialogHeader>
      <Separator className="w-full" />
      
      {editingEntry && (
        <AddressBookEntryForm
          onSubmit={handleEditEntry}
          defaultValues={{
            address: editingEntry.address.toString(),
            name: editingEntry.name
          }}
          actionLabel="Update"
        />
      )}
      
      <Button
        variant="outline"
        onClick={() => {
          setMode('list');
          setEditingEntry(null);
        }}
        data-testid="cancel-edit-address-book-entry-button"
      >
        Cancel
      </Button>
    </div>
  );

  return (
    <DialogContent className="sm:max-w-[500px]">
      {mode === 'list' && renderListView()}
      {mode === 'add' && renderAddView()}
      {mode === 'edit' && renderEditView()}
    </DialogContent>
  );
}