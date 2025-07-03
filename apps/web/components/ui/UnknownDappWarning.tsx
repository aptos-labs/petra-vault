import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import ExpandingContainer from '../ExpandingContainer';

interface UnknownDappWarningProps {
  url: string;
  onContinue: (rememberChoice?: boolean) => void;
  onGoBack: () => void;
}

export function UnknownDappWarning({
  url,
  onContinue,
  onGoBack
}: UnknownDappWarningProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const urlParts = useMemo(() => {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;
      const protocol = parsedUrl.protocol + '//';
      const rest = url.substring(protocol.length + domain.length);

      return { protocol, domain, rest, fullUrl: url };
    } catch {
      return { protocol: '', domain: url, rest: '', fullUrl: url };
    }
  }, []);

  return (
    <div className="absolute inset-0 bg-background/80 border rounded-md backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <ExpandingContainer>
        <Card className="max-w-md w-full">
          <CardContent>
            <div className="items-start gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">Application Warning</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Interacting with this app may expose you to risks.
                  </p>
                </div>

                <div className="space-y-2 border p-4 rounded border-dashed border-destructive/30 dark:border-destructive/80">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold break-all">
                      <span className="text-destructive font-bold">
                        {urlParts.protocol}
                        {urlParts.domain}
                      </span>
                      <span className="text-destructive/80">
                        {urlParts.rest}
                      </span>
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please verify the URL is correct and that you trust this
                    application before continuing. Only interact with
                    applications you trust.
                  </p>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="confirm-risk"
                    checked={isConfirmed}
                    onCheckedChange={(checked) =>
                      setIsConfirmed(checked === true)
                    }
                  />
                  <Label
                    htmlFor="confirm-risk"
                    className="text-xs cursor-pointer"
                  >
                    I understand the risks and want to proceed to this
                    application
                  </Label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={onGoBack}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Go Back
                  </Button>
                  <Button
                    onClick={() => onContinue(rememberChoice)}
                    size="sm"
                    className="flex-1"
                    disabled={!isConfirmed}
                  >
                    Continue Anyway
                  </Button>
                </div>

                <Collapsible
                  open={isAdvancedOpen}
                  onOpenChange={setIsAdvancedOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="link" size="sm">
                      <div className="flex items-center gap-1">
                        Advanced Options
                        <ChevronDown
                          className={`h-3 w-3 ml-1 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="flex items-start gap-3 p-3 border rounded-md">
                      <Checkbox
                        id="remember-choice"
                        checked={rememberChoice}
                        onCheckedChange={(checked) =>
                          setRememberChoice(checked === true)
                        }
                      />
                      <Label
                        htmlFor="remember-choice"
                        className="text-xs cursor-pointer"
                      >
                        Remember this choice and don't show this warning again
                        for this domain
                      </Label>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </CardContent>
        </Card>
      </ExpandingContainer>
    </div>
  );
}
