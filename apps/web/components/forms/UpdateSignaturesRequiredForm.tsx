'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  Form
} from '../ui/form';
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger
} from '../ui/select';

const formSchema = z.object({
  signaturesRequired: z.coerce
    .number()
    .min(1, 'Signatures required must be greater than 0')
});

export type UpdateSignaturesRequiredFormValues = z.infer<typeof formSchema>;

interface UpdateSignaturesRequiredFormProps {
  onSubmit: (values: UpdateSignaturesRequiredFormValues) => void;
  ownersCount: number;
  currentSignaturesRequired: number;
}

export default function UpdateSignaturesRequiredForm({
  onSubmit,
  ownersCount,
  currentSignaturesRequired
}: UpdateSignaturesRequiredFormProps) {
  const form = useForm<UpdateSignaturesRequiredFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      signaturesRequired: currentSignaturesRequired
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
        <div>
          <h3 className="font-display tracking-wide font-semibold">
            Signatures Required
          </h3>
          <p className="text-muted-foreground text-sm">
            The number of signatures required to execute a transaction.
          </p>
          <div className="flex items-center mt-4 gap-2">
            <FormField
              control={form.control}
              name="signaturesRequired"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="signatures-required-select">
                        <SelectValue placeholder="Select signatures required" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: ownersCount }, (_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <span className="text-muted-foreground font-display text-sm">
              signatures required out of {ownersCount}
            </span>
          </div>
        </div>

        <Button
          type="submit"
          data-testid="update-signatures-required-button"
          disabled={
            form.watch('signaturesRequired') === currentSignaturesRequired
          }
        >
          Draft Proposal
        </Button>
      </form>
    </Form>
  );
}
