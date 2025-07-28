'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '../ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import { isAddress } from '@aptos-labs/ts-sdk';
import { useClients } from '@aptos-labs/react';
import { useState } from 'react';

const formSchema = z.object({
  address: z
    .string()
    .min(1, 'Address is required'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores')
});

export type AddressBookEntryFormValues = z.infer<typeof formSchema>;

interface AddressBookEntryFormProps {
  onSubmit: (values: AddressBookEntryFormValues & { resolvedAddress: AccountAddress }) => void;
  defaultValues?: Partial<AddressBookEntryFormValues>;
  actionLabel?: string;
  className?: string;
  disabled?: boolean;
}

export default function AddressBookEntryForm({
  onSubmit,
  defaultValues,
  actionLabel = 'Save',
  className = 'flex flex-col gap-5',
  disabled = false
}: AddressBookEntryFormProps) {
  const { client } = useClients();
  const [isValidating, setIsValidating] = useState(false);
  
  const form = useForm<AddressBookEntryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: defaultValues?.address || '',
      name: defaultValues?.name || ''
    },
    mode: 'onChange',
    disabled
  });

  const handleSubmit = async (values: AddressBookEntryFormValues) => {
    setIsValidating(true);
    try {
      let resolvedAddress: AccountAddress;

      if (isAddress(values.address)) {
        resolvedAddress = AccountAddress.from(values.address);
      } else {
        // Try to resolve as ANS name
        const address = await client.fetchAddressFromName({ name: values.address });
        if (!address) {
          form.setError('address', { message: 'Unable to resolve ANS name' });
          return;
        }
        resolvedAddress = address;
      }

      onSubmit({ ...values, resolvedAddress });
    } catch (error) {
      form.setError('address', { message: 'Invalid address or ANS name' });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn(className)}>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0x1234... or name.apt" 
                  {...field}
                  disabled={disabled || !!defaultValues?.address} // Disable if editing
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="My friend Alice" 
                  {...field}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button
          type="submit"
          className="w-full"
          disabled={disabled || isValidating}
          isLoading={isValidating}
          data-testid="save-address-book-entry-button"
        >
          {actionLabel}
        </Button>
      </form>
    </Form>
  );
}