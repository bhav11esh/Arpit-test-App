import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Database, MapPin, Users, Network, BarChart3, UserCog } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AdminConfigScreen - V1 SYSTEM SETUP ONLY
 * 
 * ⚠️ CRITICAL: This is NOT operational control - it is environment setup.
 * 
 * 🔒 BOUNDARY ENFORCEMENT:
 * - This screen provides CRUD for system configuration entities (clusters, dealerships, photographers, mappings)
 * - Configuration changes affect FUTURE deliveries only
 * - NEVER mutates existing deliveries, logs, incentives, or reel backlog
 * - Mappings are declarative setup, NOT dynamic reassignment
 * 
 * 📌 ONE-WAY DEPENDENCY:
 * - Execution workflows can READ config
 * - Config CANNOT mutate execution state
 * 
 * This is "editable seed data for V1," not a governance system.
 */

export function AdminConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Admin-only access guard
  if (user?.role !== 'ADMIN') {
    toast.error('Access denied. Admin privileges required.');
    navigate('/');
    return null;
  }

  const configSections = [
    {
      id: 'clusters',
      title: 'Clusters',
      description: 'Manage geographic clusters for delivery organization',
      icon: MapPin,
      color: 'bg-blue-100 text-blue-600',
      route: '/admin/config/clusters',
    },
    {
      id: 'dealerships',
      title: 'Dealerships',
      description: 'Manage showrooms and dealership locations',
      icon: Database,
      color: 'bg-green-100 text-green-600',
      route: '/admin/config/dealerships',
    },
    {
      id: 'photographers',
      title: 'Photographers',
      description: 'Manage photographer profiles and status',
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
      route: '/admin/config/photographers',
    },
    {
      id: 'mappings',
      title: 'Mappings',
      description: 'Configure cluster ↔ dealership ↔ photographer relationships',
      icon: Network,
      color: 'bg-orange-100 text-orange-600',
      route: '/admin/config/mappings',
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/view')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">System Configuration</h1>
          <p className="text-sm text-gray-600">
            Manage core entities and relationships
          </p>
        </div>
      </div>

      {/* Admin Management Cards */}
      <div className="grid gap-4 mb-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-blue-200"
          onClick={() => navigate('/admin/users')}
        >
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <UserCog className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle>User Management</CardTitle>
                <CardDescription className="mt-1">
                  Create, edit, and manage user accounts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-purple-200"
          onClick={() => navigate('/admin/analytics')}
        >
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription className="mt-1">
                  View delivery statistics and performance metrics
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Configuration Cards */}
      <div className="grid gap-4">
        {configSections.map(section => {
          const Icon = section.icon;
          return (
            <Card
              key={section.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(section.route)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Warning Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-orange-600 text-xl">⚠️</div>
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">V1 Configuration Scope</p>
              <p className="mb-2">
                This is system setup, not operational control. Configuration 
                changes apply to <strong>future deliveries only</strong> and 
                will NOT affect:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Existing deliveries, status, or assignments</li>
                <li>Reel backlog or incentive calculations</li>
                <li>Logs or historical data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}