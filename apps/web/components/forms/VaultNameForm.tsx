'use client';
import { Input } from '../ui/input';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'The name must be at least 2 characters.'
  })
});

interface VaultNameFormProps {
  label?: string;
  actionLabel?: string;
  actionClassName?: string;
  className?: string;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: z.infer<typeof formSchema>;
}

export default function VaultNameForm({
  label = 'Name',
  actionLabel = 'Create a New Vault',
  actionClassName,
  className = 'flex flex-col gap-5',
  onSubmit,
  defaultValues
}: VaultNameFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || 'My Petra Vault'
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn(className)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input placeholder="My Petra Vault" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className={cn('w-full', actionClassName)}
          data-testid="create-vault-button"
        >
          {actionLabel}
        </Button>
      </form>
    </Form>
  );
}
