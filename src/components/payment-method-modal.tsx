import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";
import { initiateStripePayment, initiatePaymobPayment } from "@/lib/payment-service";

export interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  userId: string;
  userEmail: string;
  courseTitle: string;
  priceUsd: number;
  priceEgp: number;
  onPaymentInitiated?: (provider: "stripe" | "paymob", result: any) => void;
}

export function PaymentMethodModal({
  open,
  onOpenChange,
  courseId,
  userId,
  userEmail,
  courseTitle,
  priceUsd,
  priceEgp,
  onPaymentInitiated,
}: PaymentMethodModalProps) {
  const [loading, setLoading] = useState<"stripe" | "paymob" | null>(null);

  const handleStripePayment = async () => {
    setLoading("stripe");
    try {
      const result = await initiateStripePayment(userId, courseId, userEmail);

      if (!result.success) {
        toast.error(result.error || "Failed to initiate payment");
        setLoading(null);
        return;
      }

      onPaymentInitiated?.("stripe", result);

      // Redirect to Stripe checkout
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (error) {
      console.error("Stripe payment error:", error);
      toast.error("Failed to initiate payment");
      setLoading(null);
    }
  };

  const handlePaymobPayment = async () => {
    setLoading("paymob");
    try {
      const result = await initiatePaymobPayment(userId, courseId, userEmail);

      if (!result.success) {
        toast.error(result.error || "Failed to initiate payment");
        setLoading(null);
        return;
      }

      onPaymentInitiated?.("paymob", result);

      // Close modal and emit event for Paymob checkout
      onOpenChange(false);

      // Emit custom event for parent component to handle Paymob checkout
      window.dispatchEvent(
        new CustomEvent("paymob-checkout", {
          detail: {
            clientSecret: result.clientSecret,
            paymentId: result.paymentId,
          },
        })
      );
    } catch (error) {
      console.error("Paymob payment error:", error);
      toast.error("Failed to initiate payment");
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Payment Method</DialogTitle>
          <DialogDescription>
            Select how you'd like to pay for <span className="font-semibold text-foreground">{courseTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stripe Option */}
          <button
            onClick={handleStripePayment}
            disabled={loading !== null}
            className="w-full rounded-lg border-2 border-transparent bg-card p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-lg bg-blue-100 p-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Pay with Card (International)</h3>
                  <p className="text-sm text-muted-foreground">Stripe - Visa, Mastercard, Amex</p>
                  <p className="mt-2 text-lg font-bold text-foreground">${priceUsd.toFixed(2)} USD</p>
                </div>
              </div>
              {loading === "stripe" && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
          </button>

          {/* Paymob Option */}
          <button
            onClick={handlePaymobPayment}
            disabled={loading !== null}
            className="w-full rounded-lg border-2 border-transparent bg-card p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-lg bg-green-100 p-2">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Pay with Paymob (Egypt)</h3>
                  <p className="text-sm text-muted-foreground">Cards, Mobile Wallets, Bank Transfer</p>
                  <p className="mt-2 text-lg font-bold text-foreground">EGP {priceEgp.toFixed(2)}</p>
                </div>
              </div>
              {loading === "paymob" && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
          </button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading !== null}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
