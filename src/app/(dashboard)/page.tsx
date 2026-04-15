/**
 * Dashboard Home Page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, Code2, History, Zap, Settings, Gift } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome to DeBuggAI</h1>
          <p className="text-muted-foreground mt-2">
            Debug any code and build production-ready apps with AI
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Zap className="mr-2 h-4 w-4" />
          30 Credits
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Debug Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bug className="mr-2 h-5 w-5 text-red-500" />
              Debug Code
            </CardTitle>
            <CardDescription>
              Fix errors in JavaScript, Python, PHP, Go, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/debug">
              <Button className="w-full">Start Debugging</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Web Builder Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code2 className="mr-2 h-5 w-5 text-blue-500" />
              Web Builder
            </CardTitle>
            <CardDescription>
              Generate complete apps with MERN, Laravel, Django, and other stacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/web-builder">
              <Button className="w-full">Build App</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Debug Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Across all languages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Apps Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">With Web Builder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">30</div>
            <p className="text-xs text-muted-foreground mt-1">Free plan resets monthly</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <Link href="/pricing">
            <Button variant="outline" className="w-full justify-start">
              <Zap className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href="/referrals">
            <Button variant="outline" className="w-full justify-start">
              <Gift className="mr-2 h-4 w-4" />
              Refer & Earn
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
