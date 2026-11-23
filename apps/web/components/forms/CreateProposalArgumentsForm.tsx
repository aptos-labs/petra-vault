'use client';

import { useEffect, useMemo } from 'react';
import { z, ZodObject, ZodString, ZodTypeAny } from 'zod';
import { getTypeTagDefaultZodValue, transformTypeTagToZod } from '@/lib/zod';
import { EntryFunctionABI, TypeTagVector } from '@aptos-labs/ts-sdk';
import { FormField, FormLabel, FormMessage } from '../ui/form';
import { FormControl } from '../ui/form';
import { Input } from '../ui/input';
import { Form, FormItem } from '../ui/form';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormArrayInput from '../FormArrayInput';
import {
  Card,
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent
} from '../ui/card';
import React from 'react';
import { EntryFunctionFormFunctionArguments } from '@/lib/types/forms';
import { EntryFunctionFormTypeArguments } from '@/lib/types/forms';
import MoveOptionSwitch from '../MoveOptionSwitch';
import { MOVE_OPTION_NONE } from '@/lib/abis';

interface CreateProposalArgumentsFormProps {
  abi: EntryFunctionABI;
  onFunctionArgumentsChange?: (
    functionArguments: EntryFunctionFormFunctionArguments
  ) => void;
  onTypeArgumentsChange?: (
    typeArguments: EntryFunctionFormTypeArguments
  ) => void;
  onIsFormValidChange?: (isValid: boolean) => void;
  defaultValues?: {
    functionArguments?: EntryFunctionFormFunctionArguments;
    typeArguments?: EntryFunctionFormTypeArguments;
  };
  disabled?: boolean;
}

type FormValues = {
  functionArguments: EntryFunctionFormFunctionArguments;
  typeArguments: EntryFunctionFormTypeArguments;
};

export default function CreateProposalArgumentsForm({
  abi,
  onFunctionArgumentsChange,
  onTypeArgumentsChange,
  onIsFormValidChange,
  defaultValues,
  disabled
}: CreateProposalArgumentsFormProps) {
  const formSchema = useMemo(
    () =>
      z.object({
        functionArguments:
          (abi.parameters.length ?? 0) > 0
            ? z.tuple(
                abi.parameters.map((typeTag) =>
                  z.object({
                    value: transformTypeTagToZod(typeTag)
                  })
                ) as unknown as [
                  ZodObject<{ value: ZodTypeAny }>,
                  ...ZodObject<{ value: ZodTypeAny }>[]
                ]
              )
            : z.tuple([]),
        typeArguments:
          (abi.typeParameters.length ?? 0) > 0
            ? z.tuple(
                abi.typeParameters.map(() =>
                  z.object({ value: z.string().min(1) })
                ) as unknown as [
                  ZodObject<{ value: ZodString }>,
                  ...ZodObject<{ value: ZodString }>[]
                ]
              )
            : z.tuple([])
      }) as unknown as z.ZodType<FormValues, FormValues>,
    [abi]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      functionArguments:
        defaultValues?.functionArguments ??
        abi.parameters.map((e) => ({
          value: getTypeTagDefaultZodValue(e)
        })) ??
        [],
      typeArguments:
        defaultValues?.typeArguments ??
        abi.typeParameters.map(() => ({ value: '' })) ??
        []
    },
    mode: 'onChange',
    disabled
  });

  const { fields: argFields, update: updateArg } = useFieldArray({
    control: form.control,
    name: 'functionArguments'
  });

  const { fields: typeFields, update: updateType } = useFieldArray({
    control: form.control,
    name: 'typeArguments'
  });

  useEffect(() => {
    onIsFormValidChange?.(form.formState.isValid);
  }, [form.formState.isValid, onIsFormValidChange]);

  const getTypeTagVectorMaximumDepth = (
    typeTag: TypeTagVector,
    acc: number
  ): number => {
    if (typeTag.value.isVector()) {
      return getTypeTagVectorMaximumDepth(
        typeTag.value as TypeTagVector,
        acc + 1
      );
    }
    return acc;
  };

  return (
    <Form {...form}>
      <form>
        <Card>
          <CardHeader>
            <CardTitle>2. Argument Details</CardTitle>
            <CardDescription>
              Define the arguments for the entry function.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground font-display">
                Type Arguments
              </p>
              {abi.typeParameters.length > 0 ? (
                typeFields.map((typeField, i) => {
                  return (
                    <FormField
                      key={`type.${i}`}
                      name={`typeArguments.${i}.value`}
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="capitalize">{`T${i}`}</FormLabel>
                          <FormControl>
                            <Input
                              {...typeField}
                              {...field}
                              placeholder="Type Argument"
                              value={typeField.value}
                              onChange={(e) => {
                                field.onChange(e);
                                updateType(i, {
                                  value: e.target.value
                                });
                                onTypeArgumentsChange?.(
                                  form.getValues('typeArguments')
                                );
                              }}
                              data-testid={`type-argument-input-${i}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })
              ) : (
                <div className="flex items-center justify-center text-xs border-dashed text-muted-foreground font-display border rounded-md py-8">
                  No type arguments
                </div>
              )}
              <p className="text-sm text-muted-foreground font-display">
                Arguments
              </p>
              {abi.parameters.length > 0 ? (
                argFields.map((argField, i) => {
                  const argTypeTag = abi.parameters[i];
                  return (
                    <FormField
                      key={`arg.${i}`}
                      name={`functionArguments.${i}.value`}
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="capitalize">
                            {argTypeTag?.toString()}
                          </FormLabel>
                          <FormControl>
                            {argTypeTag?.isVector() ? (
                              <FormArrayInput
                                value={argField.value}
                                onChange={(value) => {
                                  field.onChange({
                                    target: {
                                      value: value
                                    }
                                  });
                                  updateArg(i, {
                                    value
                                  });
                                  onFunctionArgumentsChange?.(
                                    form.getValues('functionArguments')
                                  );
                                }}
                                maximumDepth={getTypeTagVectorMaximumDepth(
                                  argTypeTag as TypeTagVector,
                                  0
                                )}
                                data-testid={`function-argument-array-input-${i}`}
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  {...argField}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    updateArg(i, {
                                      value: e.target.value
                                    });
                                    onFunctionArgumentsChange?.(
                                      form.getValues('functionArguments')
                                    );
                                  }}
                                  disabled={argField.value === 'Option::none'}
                                  data-testid={`function-argument-input-${i}`}
                                />
                                {argTypeTag?.isStruct() &&
                                  argTypeTag.isOption() && (
                                    <MoveOptionSwitch
                                      onCheckedChange={(checked) => {
                                        const value = checked
                                          ? MOVE_OPTION_NONE
                                          : '';

                                        field.onChange({
                                          target: { value }
                                        });
                                        updateArg(i, { value });
                                        onFunctionArgumentsChange?.(
                                          form.getValues('functionArguments')
                                        );
                                      }}
                                    />
                                  )}
                              </div>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })
              ) : (
                <div className="flex items-center justify-center text-xs border-dashed text-muted-foreground font-display border rounded-md py-8">
                  No arguments
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

export const MemoizedCreateProposalArgumentsForm = React.memo(
  CreateProposalArgumentsForm
);
