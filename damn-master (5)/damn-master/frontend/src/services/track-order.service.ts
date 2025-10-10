import { server$ } from '@qwik.dev/router';
import { Order } from '~/generated/graphql';
import gql from 'graphql-tag';

export interface OrderTrackingResult {
  order?: Order;
  error?: string;
  success: boolean;
}

/**
 * Shared server function to track order via GraphQL
 */
export const trackOrderServer = server$(async (orderCode: string, email: string): Promise<OrderTrackingResult> => {
  try {
    const { requester } = await import('~/utils/api');
    const { trackOrder } = await requester<
      { trackOrder: OrderTrackingResult },
      { orderCode: string; email: string }
    >(
      gql`
        query trackOrder($orderCode: String!, $email: String!) {
          trackOrder(orderCode: $orderCode, email: $email) {
            success
            error
            order {
              id
              code
              state
              orderPlacedAt
              totalWithTax
              subTotalWithTax
              shippingWithTax
              currencyCode
              totalQuantity
              customer {
                id
                firstName
                lastName
                emailAddress
              }
              shippingAddress {
                fullName
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
                phoneNumber
              }
              lines {
                id
                quantity
                unitPriceWithTax
                linePriceWithTax
                productVariant {
                  id
                  name
                  sku
                  customFields {
                    salePrice
                    preOrderPrice
                    shipDate
                  }
                  product {
                    name
                    slug
                  }
                }
                featuredAsset {
                  preview
                }
              }
              fulfillments {
                id
                state
                method
                trackingCode
                createdAt
                updatedAt
              }
              payments {
                id
                method
                amount
                state
                createdAt
              }
            }
          }
        }
      `,
      { orderCode, email }
    );
    return trackOrder;
  } catch (error) {
    console.error('Order tracking error:', error);
    return {
      success: false,
      error: 'Unable to track order at this time. Please try again later.',
    };
  }
});