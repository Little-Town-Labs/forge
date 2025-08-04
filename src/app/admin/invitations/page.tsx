"use client";

import React, { useEffect, useState } from "react";
import { SignedIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import Header from "@/components/Header";
import { Mail, Plus, Trash2, RefreshCw, CheckCircle, Clock, X } from "lucide-react";

interface Invitation {
  id: string;
  emailAddress: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

interface InvitationListResponse {
  success: boolean;
  invitations: Invitation[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}

const InvitationManagement: React.FC = () => {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; hourlyRemaining: number } | null>(null);

  // Fetch invitations when component mounts
  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/invitations");
      const data: InvitationListResponse = await response.json();
      
      if (data.success) {
        setInvitations(data.invitations);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to fetch invitations" });
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
      setMessage({ type: "error", text: "Failed to fetch invitations" });
    } finally {
      setIsLoading(false);
    }
  };

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      setMessage({ type: "error", text: "Please enter an email address" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setMessage({ type: "error", text: "Please enter a valid email address" });
      return;
    }

    try {
      setIsCreating(true);
      setMessage(null);
      
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailAddress: newEmail.trim() }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: "success", text: `Invitation sent to ${newEmail}` });
        setNewEmail("");
        
        // Extract rate limit info from headers
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const hourlyRemaining = response.headers.get('X-RateLimit-Hourly-Remaining');
        if (remaining && hourlyRemaining) {
          setRateLimitInfo({
            remaining: parseInt(remaining),
            hourlyRemaining: parseInt(hourlyRemaining)
          });
        }
        
        fetchInvitations(); // Refresh the list
      } else {
        // Handle rate limiting specifically
        if (response.status === 429) {
          setMessage({ type: "warning", text: data.error || "Rate limit exceeded. Please wait before sending more invitations." });
        } else {
          setMessage({ type: "error", text: data.error || "Failed to create invitation" });
        }
      }
    } catch (error) {
      console.error("Failed to create invitation:", error);
      setMessage({ type: "error", text: "Failed to create invitation" });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeInvitation = async (invitationId: string, emailAddress: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${emailAddress}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: "success", text: `Invitation for ${emailAddress} has been revoked` });
        fetchInvitations(); // Refresh the list
      } else {
        setMessage({ type: "error", text: data.error || "Failed to revoke invitation" });
      }
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
      setMessage({ type: "error", text: "Failed to revoke invitation" });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-orange-500" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "revoked":
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <AdminGuard>
      <SignedIn>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header className="py-8 px-4" />
          
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      Invitation Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                      Send and manage user invitations
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/admin")}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    ← Back to Admin
                  </button>
                </div>
              </div>

            {/* Message Display */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === "success" 
                  ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200" 
                  : message.type === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
                  : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
              }`}>
                {message.text}
              </div>
            )}
            
            {/* Rate Limit Information */}
            {rateLimitInfo && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span>Rate Limit Status:</span>
                  <span>
                    {rateLimitInfo.remaining} remaining this minute, {rateLimitInfo.hourlyRemaining} remaining this hour
                  </span>
                </div>
              </div>
            )}

            {/* Create Invitation Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Send New Invitation
              </h2>
              
              <form onSubmit={createInvitation} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={isCreating}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isCreating ? "Sending..." : "Send Invitation"}
                </button>
              </form>
            </div>

            {/* Invitations List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Pending Invitations
                  </h2>
                  <button
                    onClick={fetchInvitations}
                    disabled={isLoading}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading invitations...</p>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">No pending invitations</p>
                  </div>
                ) : (
                  invitations.map((invitation) => (
                    <div key={invitation.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {invitation.emailAddress}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            {getStatusIcon(invitation.status)}
                            <span className="capitalize">{invitation.status}</span>
                            <span>•</span>
                            <span>Sent {formatDate(invitation.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {invitation.status === "pending" && (
                        <button
                          onClick={() => revokeInvitation(invitation.id, invitation.emailAddress)}
                          className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Revoke invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </SignedIn>
    </AdminGuard>
  );
};

export default InvitationManagement;