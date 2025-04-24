import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddStudentForm from "@/components/AddStudentForm";
import AddTeacherForm from "@/components/AddTeacherForm";
import { AddHodForm } from "@/components/AddHodForm";

const HodDashboard = () => {
  return (
    <div className="p-4">
      <Tabs defaultValue="management" className="w-full">
        <TabsList>
          <TabsTrigger value="management">User Management</TabsTrigger>
          <TabsTrigger value="hod">HOD Management</TabsTrigger>
        </TabsList>
        <TabsContent value="management">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Add New Student</CardTitle>
              </CardHeader>
              <CardContent>
                <AddStudentForm />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add New Teacher</CardTitle>
              </CardHeader>
              <CardContent>
                <AddTeacherForm />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="hod">
          <Card>
            <CardHeader>
              <CardTitle>Add HOD Account</CardTitle>
              <CardDescription>Only nithesh@gmail.com can be registered as HOD</CardDescription>
            </CardHeader>
            <CardContent>
              <AddHodForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HodDashboard;
