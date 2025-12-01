import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AboutUs() {
    const team = [
        {
            name: "Daksh",
            role: "CEO",
            initials: "D",
            description: "Leading the vision and strategy of Bharat Bill."
        },
        {
            name: "Dakshay Sachdeva",
            role: "CMO",
            initials: "DS",
            description: "Driving growth and market presence."
        },
        {
            name: "Gaurav",
            role: "Founder",
            initials: "G",
            description: "Just shows up sometimes"
        }
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">About Us</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {team.map((member, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="flex flex-col items-center pb-2">
                            <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src="" alt={member.name} />
                                <AvatarFallback className="text-xl font-bold">{member.initials}</AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-xl text-center">{member.name}</CardTitle>
                            <CardDescription className="text-center font-medium text-primary">{member.role}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-center text-muted-foreground text-sm">
                                {member.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Bharat Bill is dedicated to simplifying billing and invoicing for businesses across India.
                        Our goal is to provide a seamless, efficient, and user-friendly platform that empowers
                        entrepreneurs to focus on what they do best - growing their business.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
