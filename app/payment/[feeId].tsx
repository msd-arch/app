import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Linking,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import * as Haptics from 'expo-haptics';
import PrimaryButton from '../../components/PrimaryButton';
import {
  fetchFeeById,
  fetchBankAccount,
  submitPayment,
  FeeRecord,
  BankAccount,
} from '../../api/fees';
import { Colors } from '../../constants/colors';

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Review', 'Payment', 'Confirm'];
  return (
    <View style={si.row}>
      {steps.map((label, idx) => {
        const step = idx + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            {idx > 0 && (
              <View style={[si.connector, done && si.connectorDone]} />
            )}
            <View style={si.stepWrap}>
              <View
                style={[
                  si.circle,
                  active && si.circleActive,
                  done && si.circleDone,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={[si.stepNum, active && si.stepNumActive]}>
                    {step}
                  </Text>
                )}
              </View>
              <Text style={[si.stepLabel, active && si.stepLabelActive]}>
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  stepWrap: { alignItems: 'center', gap: 4 },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  connectorDone: { backgroundColor: Colors.navy },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: { borderColor: Colors.navy, backgroundColor: Colors.navy },
  circleDone: { borderColor: Colors.navy, backgroundColor: Colors.navy },
  stepNum: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, fontFamily: 'Inter-Bold' },
  stepNumActive: { color: '#FFF' },
  stepLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Inter-Regular' },
  stepLabelActive: { color: Colors.navy, fontWeight: '700', fontFamily: 'Inter-Bold' },
});

// ─── Animated Checkmark ───────────────────────────────────────────────────────
function AnimatedCheckmark() {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      bounciness: 12,
      useNativeDriver: true,
      delay: 100,
    }).start();
  }, [scale]);

  return (
    <Animated.View
      style={[ck.circle, { transform: [{ scale }] }]}
    >
      <Ionicons name="checkmark" size={36} color="#FFF" />
    </Animated.View>
  );
}

const ck = StyleSheet.create({
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
});

// ─── Shared input style ────────────────────────────────────────────────────────
const INPUT = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  field: {
    height: 52,
    backgroundColor: '#F7F9FC',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  focused: { borderColor: Colors.navy },
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatCardNumber(raw: string): string {
  // Keep only digits, max 16, insert space every 4
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;
type PayMethod = 'card' | 'bank_transfer';

export default function PaymentScreen() {
  const { feeId } = useLocalSearchParams<{ feeId: string }>();
  const router = useRouter();

  // ── Fee data ───────────────────────────────────────────────────────────
  const [fee, setFee] = useState<FeeRecord | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [feeLoading, setFeeLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [f] = await Promise.all([fetchFeeById(feeId)]);
        setFee(f);
      } catch {
        /* handled below via fee === null */
      } finally {
        setFeeLoading(false);
      }
    })();
  }, [feeId]);

  // ── Step state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);
  const [payMethod, setPayMethod] = useState<PayMethod>('card');

  // Card form fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Bank transfer
  const [bankTransferConfirmed, setBankTransferConfirmed] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);

  // Step 3 result
  const [submitting, setSubmitting] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    receiptUrl?: string;
    ref?: string;
    amount?: number;
    timestamp?: string;
    message?: string;
  } | null>(null);

  // ── Load bank account when Bank Transfer is selected ───────────────────
  const loadBankAccount = useCallback(async () => {
    if (bankAccount) return;
    setBankLoading(true);
    try {
      const ba = await fetchBankAccount();
      setBankAccount(ba);
    } catch {
      /* non-fatal */
    } finally {
      setBankLoading(false);
    }
  }, [bankAccount]);

  useEffect(() => {
    if (payMethod === 'bank_transfer') loadBankAccount();
  }, [payMethod, loadBankAccount]);

  // ── Reference number ───────────────────────────────────────────────────
  const refNumber = useMemo(
    () => `INV-${feeId.slice(0, 8).toUpperCase()}`,
    [feeId],
  );

  // ── Step 2 Continue validation ─────────────────────────────────────────
  const canContinue = useMemo(() => {
    if (payMethod === 'card') {
      return (
        cardNumber.replace(/\s/g, '').length === 16 &&
        expiry.length === 5 &&
        cvv.length >= 3 &&
        cardholderName.trim().length > 1
      );
    }
    return bankTransferConfirmed;
  }, [payMethod, cardNumber, expiry, cvv, cardholderName, bankTransferConfirmed]);

  // ── Step 3: Submit payment ─────────────────────────────────────────────
  const handleSubmitPayment = useCallback(async () => {
    setSubmitting(true);
    try {
      const card_last4 =
        payMethod === 'card'
          ? cardNumber.replace(/\s/g, '').slice(-4)
          : undefined;

      const response = await submitPayment({
        fee_id: feeId,
        method: payMethod,
        card_last4,
        transaction_ref: refNumber,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaymentResult({
        success: true,
        receiptUrl: response.receipt_url,
        ref: response.transaction_ref,
        amount: response.amount,
        timestamp: response.created_at,
      });
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPaymentResult({
        success: false,
        message:
          err?.response?.data?.detail ??
          'Payment could not be processed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [payMethod, cardNumber, feeId, refNumber]);

  // ─────────────────────────────────────────────────────────────────────────
  if (feeLoading) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  if (!fee) {
    return (
      <View style={s.loadingScreen}>
        <Text style={s.errorMsg}>Could not load fee details.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.blueAccent, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
            ← Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Payment</Text>
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* ── STEP 1: Review ─────────────────────────────────────────── */}
        {step === 1 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>📋  FEE DETAILS</Text>

            <DetailRow label="Child" value={fee.child_name} />
            <DetailRow label="Month" value={fee.month} />
            <DetailRow
              label="Amount"
              value={`Rs. ${fee.amount.toLocaleString()}`}
              valueStyle={s.amountValue}
            />
            <DetailRow
              label="Due Date"
              value={new Date(fee.due_date + 'T00:00:00').toLocaleDateString(
                'en-US',
                { day: 'numeric', month: 'long', year: 'numeric' },
              )}
            />
            <DetailRow label="Status" value={fee.status.toUpperCase()} />

            <View style={{ marginTop: 24 }}>
              <PrimaryButton
                label="Proceed to Pay"
                onPress={() => setStep(2)}
              />
            </View>
          </View>
        )}

        {/* ── STEP 2: Payment Details ─────────────────────────────────── */}
        {step === 2 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Enter payment details</Text>

            {/* Method selector */}
            <View style={s.methodRow}>
              {(['card', 'bank_transfer'] as PayMethod[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    s.methodPill,
                    payMethod === m && s.methodPillActive,
                  ]}
                  onPress={() => setPayMethod(m)}
                >
                  <Text
                    style={[
                      s.methodPillText,
                      payMethod === m && s.methodPillTextActive,
                    ]}
                  >
                    {m === 'card' ? '💳  Card' : '🏦  Bank Transfer'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Card form ────────────────────────────────────────── */}
            {payMethod === 'card' && (
              <>
                <Text style={INPUT.label}>Card Number</Text>
                <TextInput
                  style={INPUT.field}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                  maxLength={19}
                />

                <View style={s.halfRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={INPUT.label}>Expiry (MM/YY)</Text>
                    <TextInput
                      style={INPUT.field}
                      placeholder="MM/YY"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      value={expiry}
                      maxLength={5}
                      onChangeText={(t) => {
                        const d = t.replace(/\D/g, '').slice(0, 4);
                        setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={INPUT.label}>CVV</Text>
                    <TextInput
                      style={INPUT.field}
                      placeholder="•••"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      secureTextEntry
                      value={cvv}
                      maxLength={4}
                      onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                    />
                  </View>
                </View>

                <Text style={INPUT.label}>Cardholder Name</Text>
                <TextInput
                  style={INPUT.field}
                  placeholder="Name as on card"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  value={cardholderName}
                  onChangeText={setCardholderName}
                />
              </>
            )}

            {/* ── Bank Transfer ─────────────────────────────────── */}
            {payMethod === 'bank_transfer' && (
              <>
                {bankLoading ? (
                  <ActivityIndicator color={Colors.navy} style={{ marginVertical: 16 }} />
                ) : bankAccount ? (
                  <View style={s.bankBox}>
                    <BankDetailRow label="Bank" value={bankAccount.bank_name} />
                    <BankDetailRow label="Account Name" value={bankAccount.account_name} />
                    <BankDetailRow label="Account No." value={bankAccount.account_number} />
                    <BankDetailRow label="IBAN" value={bankAccount.iban} />
                    <BankDetailRow label="Branch" value={bankAccount.branch} />
                    <View style={s.refBox}>
                      <Text style={s.refLabel}>Please use this reference:</Text>
                      <Text style={s.refValue}>{refNumber}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.bankError}>
                    Could not load bank details. Please try again.
                  </Text>
                )}

                {/* Confirmation checkbox */}
                <TouchableOpacity
                  style={s.checkRow}
                  onPress={() => setBankTransferConfirmed((v) => !v)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.checkbox,
                      bankTransferConfirmed && s.checkboxChecked,
                    ]}
                  >
                    {bankTransferConfirmed && (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    )}
                  </View>
                  <Text style={s.checkLabel}>
                    I have made the transfer using the reference above
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={{ marginTop: 8, gap: 12 }}>
              <PrimaryButton
                label="Continue"
                onPress={() => setStep(3)}
                disabled={!canContinue}
              />
              <TouchableOpacity onPress={() => setStep(1)} style={s.backLink}>
                <Text style={s.backText}>← Back to Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 3: Confirm & Receipt ──────────────────────────────── */}
        {step === 3 && (
          <View style={s.card}>
            {paymentResult === null ? (
              /* Confirm prompt — not yet submitted */
              <>
                <Text style={s.cardTitle}>Confirm Payment</Text>
                <View style={s.confirmSummary}>
                  <DetailRow label="Amount" value={`Rs. ${fee.amount.toLocaleString()}`} valueStyle={s.amountValue} />
                  <DetailRow label="Method" value={payMethod === 'card' ? `Card ••••${cardNumber.replace(/\s/g, '').slice(-4)}` : 'Bank Transfer'} />
                  <DetailRow label="Reference" value={refNumber} />
                </View>
                <View style={{ marginTop: 24, gap: 12 }}>
                  <PrimaryButton
                    label="Confirm & Pay"
                    onPress={handleSubmitPayment}
                    loading={submitting}
                  />
                  <TouchableOpacity onPress={() => setStep(2)} style={s.backLink}>
                    <Text style={s.backText}>← Back to Payment Details</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : paymentResult.success ? (
              /* ── Success ─────────────────────────────────────────── */
              <>
                <AnimatedCheckmark />
                <Text style={s.successTitle}>Payment Successful!</Text>
                <View style={s.receiptCard}>
                  <DetailRow label="Amount" value={`Rs. ${(paymentResult.amount ?? fee.amount).toLocaleString()}`} valueStyle={s.amountValue} />
                  <DetailRow label="Reference" value={paymentResult.ref ?? refNumber} />
                  <DetailRow
                    label="Date & Time"
                    value={
                      paymentResult.timestamp
                        ? new Date(paymentResult.timestamp).toLocaleString('en-US')
                        : new Date().toLocaleString('en-US')
                    }
                  />
                </View>
                <View style={{ gap: 12, marginTop: 20 }}>
                  {paymentResult.receiptUrl && (
                    <PrimaryButton
                      label="Download Receipt"
                      onPress={() => Linking.openURL(paymentResult.receiptUrl!)}
                    />
                  )}
                  <TouchableOpacity
                    style={s.backLink}
                    onPress={() => router.replace('/(tabs)/fees' as any)}
                  >
                    <Text style={[s.backText, { textAlign: 'center' }]}>
                      Back to Fees
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ── Error ───────────────────────────────────────────── */
              <>
                <View style={s.errorIcon}>
                  <Ionicons name="close" size={36} color="#FFF" />
                </View>
                <Text style={s.errorTitle}>Payment Failed</Text>
                <Text style={s.errorDetail}>{paymentResult.message}</Text>
                <View style={{ gap: 12, marginTop: 20 }}>
                  <PrimaryButton
                    label="Try Again"
                    onPress={() => setPaymentResult(null)}
                  />
                  <TouchableOpacity
                    style={s.backLink}
                    onPress={() => router.back()}
                  >
                    <Text style={[s.backText, { textAlign: 'center' }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={dr.row}>
      <Text style={dr.label}>{label}</Text>
      <Text style={[dr.value, valueStyle]}>{value}</Text>
    </View>
  );
}

const dr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  label: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter-Regular' },
  value: { fontSize: 14, color: Colors.textPrimary, fontFamily: 'Inter-SemiBold', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});

function BankDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={bd.row}>
      <Text style={bd.label}>{label}</Text>
      <Text style={bd.value}>{value}</Text>
    </View>
  );
}

const bd = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 13, color: Colors.textMuted, fontFamily: 'Inter-Regular' },
  value: { fontSize: 13, color: Colors.textPrimary, fontFamily: 'Inter-SemiBold', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorMsg: { fontSize: 15, color: Colors.textMuted, fontFamily: 'Inter-Regular' },

  header: { backgroundColor: Colors.navy },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter-Bold', color: '#FFF' },

  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: Colors.navy,
  },

  // Method pills
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodPillActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  methodPillText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter-SemiBold', color: Colors.textMuted },
  methodPillTextActive: { color: '#FFF' },

  halfRow: { flexDirection: 'row' },

  // Bank transfer
  bankBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  refLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Inter-Regular', marginBottom: 4 },
  refValue: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter-Bold', color: Colors.navy },
  bankError: { fontSize: 14, color: Colors.red, fontFamily: 'Inter-Regular', marginBottom: 12 },

  // Checkbox
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  checkLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontFamily: 'Inter-Regular', lineHeight: 20 },

  // Back link
  backLink: { alignItems: 'center', paddingVertical: 4 },
  backText: { fontSize: 14, color: Colors.blueAccent, fontFamily: 'Inter-SemiBold' },

  // Confirm step
  confirmSummary: { marginTop: 4 },

  // Success
  successTitle: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter-Bold', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  receiptCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Error state
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  errorTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter-Bold', color: Colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  errorDetail: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 20 },
});
