import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import PrivateRoute from "@/components/PrivateRoute";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";
import Parties from "@/pages/Parties";
import Products from "@/pages/Products";
import Invoices from "@/pages/Invoices";
import InvoiceForm from "@/pages/InvoiceForm";
import Quotations from "@/pages/Quotations";
import QuotationForm from "@/pages/QuotationForm";
import InvoicePrint from "@/pages/InvoicePrint";
import Settings from "@/pages/Settings";
import Payments from "@/pages/Payments";
import PaymentForm from "@/pages/PaymentForm";
import PartyLedger from "@/pages/PartyLedger";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={
            <PrivateRoute>
              <Onboarding />
            </PrivateRoute>
          } />
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/parties" element={
            <PrivateRoute>
              <Layout>
                <Parties />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/products" element={
            <PrivateRoute>
              <Layout>
                <Products />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/parties/:id/ledger" element={
            <PrivateRoute>
              <Layout>
                <PartyLedger />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/invoices" element={
            <PrivateRoute>
              <Layout>
                <Invoices />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/invoices/new" element={
            <PrivateRoute>
              <Layout>
                <InvoiceForm />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/invoices/:id" element={
            <PrivateRoute>
              <Layout>
                <InvoiceForm />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/invoices/:id/print" element={
            <PrivateRoute>
              <InvoicePrint />
            </PrivateRoute>
          } />
          <Route path="/quotations" element={
            <PrivateRoute>
              <Layout>
                <Quotations />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/quotations/new" element={
            <PrivateRoute>
              <Layout>
                <QuotationForm />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/quotations/:id" element={
            <PrivateRoute>
              <Layout>
                <QuotationForm />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/payments" element={
            <PrivateRoute>
              <Layout>
                <Payments />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/payments/new" element={
            <PrivateRoute>
              <Layout>
                <PaymentForm />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/payments/:id" element={
            <PrivateRoute>
              <Layout>
                <PaymentForm />
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App

