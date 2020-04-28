export type User = {
    id?: string;
    name: string;
    avatarUrl?: string;
    updatedAt: FirebaseFirestore.Timestamp;
}