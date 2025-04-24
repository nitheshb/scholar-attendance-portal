
import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { useToast } from '../hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  employeeId: z.string().optional(),
  enrollmentId: z.string().optional(),
  course: z.string().optional(),
  department: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditUserFormProps {
  userId: string;
  initialData: {
    name: string;
    employeeId?: string;
    enrollmentId?: string;
    course?: string;
    department?: string;
  };
  userType: 'teacher' | 'student' | 'hod';
  open: boolean;
  onClose: () => void;
}

export function EditUserForm({ userId, initialData, userType, open, onClose }: EditUserFormProps) {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData.name,
      employeeId: initialData.employeeId || '',
      enrollmentId: initialData.enrollmentId || '',
      course: initialData.course || '',
      department: initialData.department || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Success",
        description: "User details updated successfully",
      });

      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {userType.charAt(0).toUpperCase() + userType.slice(1)} Details</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(userType === 'teacher' || userType === 'hod') && (
              <>
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter employee ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter department" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {userType === 'student' && (
              <>
                <FormField
                  control={form.control}
                  name="enrollmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enrollment ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter enrollment ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="course"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter course" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Button type="submit" className="w-full">
              Update Details
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
