import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Form,
  FormDescription
} from '../ui/form';
import EntryFunctionAutocomplete from './EntryFunctionAutocomplete';
import Callout from '../Callout';
import { useDebounce } from 'use-debounce';
import useEntryFunctionAbi from '@/hooks/useEntryFunctionAbi';
import { EntryFunctionABI } from '@aptos-labs/ts-sdk';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import React from 'react';
import ExpandingContainer from '../ExpandingContainer';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Bookmark, BookmarkCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import { useEntryFunctionBookmarks } from '@/context/useEntryFunctionBookmarks';
import { getEntryFunctionDisplayName } from '@/lib/displayNames';

const entryFunctionPresets = [
  { label: 'Transfer APT', value: '0x1::aptos_account::transfer' },
  { label: 'Transfer Coins', value: '0x1::aptos_account::transfer_coins' },
  {
    label: 'Transfer Fungible Asset',
    value: '0x1::primary_fungible_store::transfer'
  },
  {
    label: 'Batch Transfer Coins',
    value: '0x1::aptos_account::batch_transfer_coins'
  }
];

const entryFunctionFormSchema = z.object({
  entryFunction: z
    .string()
    .regex(
      /^0x[a-zA-Z0-9]+::[a-zA-Z0-9_]+::[a-zA-Z0-9_]+$/,
      'Entry function must follow the format: 0x{address}::{module_name}::{function_name}'
    )
});

type FormValues = z.infer<typeof entryFunctionFormSchema>;

interface CreateProposalEntryFunctionFormProps {
  onAbiChange?: (abi: EntryFunctionABI | undefined) => void;
  onEntryFunctionChange?: (entryFunction: string) => void;
  defaultValues?: {
    entryFunction?: string;
  };
  disabled?: boolean;
}

export default function CreateProposalEntryFunctionForm({
  onAbiChange,
  onEntryFunctionChange,
  defaultValues,
  disabled
}: CreateProposalEntryFunctionFormProps) {
  const form = useForm({
    resolver: zodResolver(entryFunctionFormSchema),
    defaultValues: { entryFunction: defaultValues?.entryFunction ?? '' },
    disabled
  });

  const [entryFunction, setEntryFunction] = useState<string>(
    defaultValues?.entryFunction ?? ''
  );
  const [debouncedEntryFunction] = useDebounce(entryFunction, 400);

  const abi = useEntryFunctionAbi({
    entryFunction: debouncedEntryFunction ?? '',
    enabled: debouncedEntryFunction?.split('::').length === 3,
    retry: 1
  });

  useEffect(() => {
    onAbiChange?.(abi.data);
  }, [abi.data, onAbiChange]);

  const { id: vaultId } = useActiveVault();

  const allBookmarks = useEntryFunctionBookmarks((s) => s.bookmarks);
  const hasBookmarksHydrated = useEntryFunctionBookmarks((s) => s.hasHydrated);
  const addBookmark = useEntryFunctionBookmarks((s) => s.addBookmark);
  const removeBookmark = useEntryFunctionBookmarks((s) => s.removeBookmark);

  const bookmarks = useMemo(
    () =>
      [...(allBookmarks[vaultId] ?? [])].sort(
        (a, b) => b.createdAt - a.createdAt
      ),
    [allBookmarks, vaultId]
  );

  return (
    <Form {...form}>
      <form>
        <Card>
          <CardHeader>
            <CardTitle>1. Entry Function Details</CardTitle>
            <CardDescription>
              Define an entry function to call in this proposal.
            </CardDescription>
          </CardHeader>
          <ExpandingContainer className="px-6">
            <FormField
              control={form.control}
              name="entryFunction"
              render={({ field }) => {
                const handleOnChange = (e: string) => {
                  setEntryFunction(e);
                  onEntryFunctionChange?.(e);
                  field.onChange(e);
                };

                const isValidEntryFunction = entryFunctionFormSchema.safeParse({
                  entryFunction: field.value
                }).success;

                const isBookmarked = bookmarks.some(
                  (bookmark) => bookmark.entryFunction === field.value
                );

                const toggleBookmark = () => {
                  if (isBookmarked) {
                    removeBookmark(vaultId, field.value);
                    toast.success('Removed bookmark');
                  } else {
                    addBookmark(vaultId, field.value);
                    toast.success('Bookmarked entry function');
                  }
                };

                return (
                  <FormItem className="w-full">
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Entry Function</FormLabel>
                      {hasBookmarksHydrated &&
                        !disabled &&
                        isValidEntryFunction && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground size-7"
                            onClick={toggleBookmark}
                            aria-pressed={isBookmarked}
                            aria-label={
                              isBookmarked
                                ? 'Remove entry function bookmark'
                                : 'Bookmark entry function'
                            }
                            data-testid="bookmark-entry-function-button"
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="text-primary" />
                            ) : (
                              <Bookmark />
                            )}
                          </Button>
                        )}
                    </div>
                    <FormControl>
                      <EntryFunctionAutocomplete
                        value={field.value}
                        name={field.name}
                        ref={field.ref}
                        disabled={field.disabled}
                        onBlur={field.onBlur}
                        onChange={handleOnChange}
                        data-testid="entry-function-input"
                      />
                    </FormControl>
                    <FormDescription>
                      Must be in the format:{' '}
                      <span className="font-mono text-xs">{`0x{address}::{module_name}::{function_name}`}</span>
                    </FormDescription>
                    {!field.value &&
                      !disabled &&
                      hasBookmarksHydrated &&
                      bookmarks.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2 w-full xl:overflow-x-scroll flex-wrap">
                          <span className="font-display text-sm font-medium mr-1">
                            Bookmarks{' '}
                          </span>
                          {bookmarks.map((bookmark) => (
                            <Badge
                              key={bookmark.entryFunction}
                              variant="secondary"
                              className="text-muted-foreground text-xs font-display cursor-pointer gap-1 pr-1"
                              onClick={() =>
                                handleOnChange(bookmark.entryFunction)
                              }
                              data-testid="entry-function-bookmark-badge"
                            >
                              {getEntryFunctionDisplayName(
                                bookmark.entryFunction
                              )}
                              <button
                                type="button"
                                className="opacity-60 hover:opacity-100"
                                aria-label="Remove bookmark"
                                data-testid="remove-entry-function-bookmark-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeBookmark(
                                    vaultId,
                                    bookmark.entryFunction
                                  );
                                }}
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                    {!field.value && !disabled && (
                      <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 w-full xl:overflow-x-scroll flex-wrap">
                        <span className="font-display text-sm font-medium mr-1">
                          Presets{' '}
                        </span>
                        {entryFunctionPresets.map((preset) => (
                          <Badge
                            key={preset.value}
                            variant="secondary"
                            className="text-muted-foreground text-xs font-display cursor-pointer"
                            onClick={() => handleOnChange(preset.value)}
                          >
                            {preset.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </FormItem>
                );
              }}
            />

            <CreateProposalEntryFunctionCallout
              form={form}
              status={
                abi.isLoading
                  ? 'loading'
                  : abi.isError
                    ? 'error'
                    : abi.isSuccess
                      ? 'success'
                      : undefined
              }
            />
          </ExpandingContainer>
        </Card>
      </form>
    </Form>
  );
}

export function CreateProposalEntryFunctionCallout({
  form,
  status
}: {
  form: UseFormReturn<FormValues>;
  status?: 'loading' | 'error' | 'success';
}) {
  useWatch({ control: form.control, name: 'entryFunction' });

  if (!form.formState.isValid) return null;

  return (
    <AnimatePresence mode="wait">
      {status === 'loading' && (
        <motion.div
          key="entry-function-call-out-loading"
          initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 10, filter: 'blur(8px)' }}
          transition={{ duration: 0.3 }}
        >
          <Callout
            status="loading"
            title="Looking for entry function..."
            description="We are checking to see if the entry function is valid."
            className="mt-6"
          />
        </motion.div>
      )}
      {status === 'error' && (
        <motion.div
          key="entry-function-call-out-error"
          initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 10, filter: 'blur(8px)' }}
          transition={{ duration: 0.3 }}
        >
          <Callout
            status="error"
            title="Entry Function Not Found"
            description="The entry function you provided is not valid. Please check the function name and address."
            className="mt-6"
          />
        </motion.div>
      )}
      {status === 'success' && (
        <motion.div
          key="entry-function-call-out-success"
          initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 10, filter: 'blur(8px)' }}
          transition={{ duration: 0.3 }}
        >
          <Callout
            status="success"
            title="Entry Function Found"
            description="The entry function you provided is valid."
            className="mt-6"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const MemoizedCreateProposalEntryFunctionForm = React.memo(
  CreateProposalEntryFunctionForm
);
