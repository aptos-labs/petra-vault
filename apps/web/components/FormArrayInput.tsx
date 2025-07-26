import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState } from 'react';
import { PlusIcon, Cross1Icon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import MoveOptionSwitch from './MoveOptionSwitch';
import { MOVE_OPTION_NONE } from '@/lib/abis';
import { TypeTagVector } from '@aptos-labs/ts-sdk';

export type FormArrayInputValue = string | FormArrayInputValue[];

interface ArrayInputProps {
  value?: FormArrayInputValue[];
  argTypeTag?: TypeTagVector;
  onChange: (value: FormArrayInputValue[]) => void;
  currentDepth?: number;
  maximumDepth?: number;
}

export default function FormArrayInput({
  argTypeTag,
  value,
  onChange,
  currentDepth = 0,
  maximumDepth = 0,
  ...props
}: ArrayInputProps) {
  const [internalValues, setInternalValues] = useState<FormArrayInputValue[]>(
    value ?? []
  );

  const handleValueChange = (newValues: FormArrayInputValue[]) => {
    setInternalValues(newValues);
    onChange(newValues);
  };

  const handleChange = (index: number, newValue: FormArrayInputValue) => {
    const newValues = [...internalValues];
    newValues[index] = newValue;
    handleValueChange(newValues);
  };

  const handleDelete = (index: number) => {
    const newValues = [...internalValues];
    newValues.splice(index, 1);
    handleValueChange(newValues);
  };

  const addArgument = () => {
    handleValueChange([...internalValues, '']);
  };

  const addNestedVector = () => {
    handleValueChange([...internalValues, []]);
  };

  const containerClass =
    currentDepth < maximumDepth
      ? 'bg-secondary p-2 border'
      : maximumDepth !== 0
        ? 'border border-dashed bg-white p-4'
        : '';

  return (
    <div
      {...props}
      className={`rounded-md grid gap-2 w-full ${containerClass}`}
    >
      <div
        className={cn('grid gap-2', !(internalValues.length > 0) && 'hidden')}
      >
        {internalValues?.map((item, index) => (
          <div key={index} className="flex items-start gap-2 rounded">
            {Array.isArray(item) ? (
              <FormArrayInput
                value={item}
                onChange={(newItemValue) => handleChange(index, newItemValue)}
                currentDepth={currentDepth + 1}
                maximumDepth={maximumDepth}
              />
            ) : (
              <div className="flex items-center gap-2 w-full">
                <Input
                  value={item}
                  onChange={(e) => handleChange(index, e.target.value)}
                  data-testid={`array-input-${currentDepth}-${index}`}
                  disabled={
                    currentDepth > maximumDepth || item === MOVE_OPTION_NONE
                  }
                  className="flex-1 w-full"
                />
                {argTypeTag?.value.isStruct() &&
                  argTypeTag.value.isOption() && (
                    <MoveOptionSwitch
                      onCheckedChange={(checked) => {
                        const value = checked ? MOVE_OPTION_NONE : '';
                        handleChange(index, value);
                      }}
                    />
                  )}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(index)}
            >
              <Cross1Icon className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {currentDepth < maximumDepth && (
          <Button
            type="button"
            variant="outline"
            onClick={addNestedVector}
            data-testid={`add-vector-button-${currentDepth}`}
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Nested Vector
          </Button>
        )}
        {currentDepth === maximumDepth && (
          <Button
            type="button"
            variant="outline"
            onClick={addArgument}
            data-testid={`add-argument-button-${currentDepth}`}
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Argument
          </Button>
        )}
      </div>
    </div>
  );
}
