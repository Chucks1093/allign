export default function NotAvailable() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-3xl font-bold text-white mb-4">Not Available in Your Region</h1>
      <p className="text-gray-400 max-w-md">
        Allign is not currently available in the United States. We are working to expand access in the future.
      </p>
    </div>
  );
}
